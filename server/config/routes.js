/**
 * Routes for express app
 */
var path = require('path');
var utils = require('../services/utils');
var interface = require('../services/interface');
var nunjucks = require('nunjucks');
var isDev = process.env.NODE_ENV === 'development';
var _ = require('lodash');
var md5 = require('md5');
var FileHandler = require('../services/file-handler');
var pluralize = require('pluralize');
var glob = require("glob");

var layoutNamespace = {};

// views model
var menus = require('../models/menus.config.json');
var widgets = require('../models/widgets.config.json');

var items_createLayout = require('../models/items/create.config.json');
var clients_createLayout = require('../models/clients/create.config.json');
var sharings_createLayout = require('../models/sharings/create.config.json');
var photos_createLayout = require('../models/photos/create.config.json');

const detailStatusOptions = [
    "等待審核素材",
    "素材審核中",
    "素材審核失敗",
    "拍攝剪輯中",
    "A copy交付",
    "A copy修改",
    "B copy交付",
    "B copy修改",
    "C copy交付",
    "成品已確認"
];

const globals = {
    submitFactorOptions: [
        { label: "單行文字", value: "string" },
        { label: "多行文字", value: "text" },
        { label: "圖片", value: "image" },
        { label: "影片", value: "video" },
        { label: "聲音", value: "audio" },
        { label: "文件", value: "file" }
    ]
};

// route middleware to make sure a user is logged in
function loginRequired(req, res, next) {
    // if user is authenticated in the session, carry on
    // if(process.env.NODE_ENV === 'development' || req.isAuthenticated()) return toNext();    
    if(req.isAuthenticated()) return next();

    // if they aren't redirect them to the home page
    res.redirect('/login?next=' + encodeURIComponent(req.originalUrl) );
}

function getYoutubeThumbnail(url){
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length == 11) {
        return "https://img.youtube.com/vi/" + match[2] + "/0.jpg";
    }
    return "";
}

function collectFields(layouts){
    if (layouts.layout == "tabs") {
        return layouts.sections
            .map(function(sec){ return sec.fields; })
            .reduce(function(f1, f2){ return f1.concat(f2) }, []);
    } else {
        return layouts.fields;
    }
}

function findSelectionLabel(val, selections) {
    var resOptions = _.filter(selections, op => op.value == val);
    return resOptions.length ? resOptions[0].label : "";
}

function getRelatedData(fields){
    const relatedFields = _.filter(fields, fd => !!fd.related );
    let relatedData = {};

    Object.keys(globals).forEach(key => {
        relatedData["globals." + key] = globals[key];
    });

    let relatedPromises = relatedFields.map( fd => {
        return interface["get" + utils.capitalize(pluralize(fd.related))]()
            .then( results => {
                let nextData = {};
                nextData[fd.related] = results;
                return nextData;
            });
    });
    return Promise.all(relatedPromises)
        .then( results => {
            _.each(results, result => {
                _.merge(relatedData, result);
            });
        })
        .then( () => {
            _.each(relatedFields, fd => {
                let relateds = relatedData[fd.related];
                relatedData[fd.related] = _.map(relateds, related => {
                    let converted = {};
                    _.each(_.keys(fd.valueMap), key => {
                        converted[key] = related[fd.valueMap[key]];
                    });
                    return converted;
                });
            });
            return relatedData;
        });
}

function mergeCollectionRelateds(fields, mutableData){
    const collectionFields = _.filter(fields, function(fd){ return fd.type == "collection" });
    let collectionPromise = [];
    _.each(collectionFields, fd => {
        let lodashMethod = "";
        if (fd.valueType == "integer") {
            lodashMethod = "toSafeInteger";
        }
        if (lodashMethod) {
            let toPromises = _.map(mutableData[fd.name] || [], val => {
                let converted =  _[lodashMethod](val);
                if ( converted == 0 ) {
                    let toCreate = {};
                    toCreate[fd.valueOnCreate] = val;
                    return interface["create" + utils.capitalize(fd.related)](toCreate)
                        .then( result => {
                            if (typeof result == "object") return result.id;
                            else if (Array.isArray(result)) return result[0].id;
                        });
                }
                return Promise.resolve(converted);
            });
            collectionPromise.push(
                Promise.all(toPromises)
                    .then( collectRes => {
                        mutableData[fd.name] = collectRes;
                    })
            );
        }
    });
    return Promise.all(collectionPromise);
}

function notFound(res){ res.status(404).send("Not found."); }
function badRequest(res){ res.status(400).send("Bad request."); }
function sendOk(res){ res.status(200).send("Ok."); }

module.exports = function(app, passport) {

    var nunEnv = nunjucks.configure(app.get('views'), {
        autoescape: true,
        watch: true,
        express: app
    });

    var nunUrlRe = /:([^\s\/]+)/g;

    nunEnv.addFilter("isNamebase", function(path, compare){
        return path && path.substr(0, compare.length) == compare;
    });

    nunEnv.addFilter("isItemActive", function(path, compare){
        if (path == compare) return true;
        if (path.substr(0, compare.length) == compare) return !isNaN(parseInt(path.slice(compare.length).split("/")[0]));
        return false;
    });

    nunEnv.addFilter("getPlace", function(opt){
        return opt.placeholder || opt.label || "";
    });

    nunEnv.addFilter("dataTransfer", function(target, tupleData){
        var result = target,
            matches;
        while( matches = nunUrlRe.exec(target) ) {
            result = result.replace(matches[0], tupleData[matches[1]]);
        }
        return result;
    });

    nunEnv.addFilter("useFormatString", function(val, format){
        return format ? format.replace("%v", val) : val;
    });

    nunEnv.addFilter("useFormatFunction", function(val, fnName){
        if (fnName) {
            if ( fnName == "dateFormat" ) return utils.dateToNormalFormat(new Date(val));
            if ( fnName == "numbers" ) return utils.tupleNumbers(val);
            if ( fnName == "yesOrNo" ) return utils.booleanText(utils.parseBoolean(val));
        }
        return val;
    });

    nunEnv.addFilter('json', function (value, spaces) {
        if (value instanceof nunjucks.runtime.SafeString) {
            value = value.toString();
        }
        const jsonString = JSON.stringify(value, null, spaces).replace(/</g, '\\u003c');
        return nunjucks.runtime.markSafe(jsonString);
    });

    nunEnv.addFilter("locale", function(num){
        return Number(num).toLocaleString();
    });
    nunEnv.addGlobal("menus", menus);
    nunEnv.addGlobal("widgets", widgets);

    // =====================================
    // Static Files ========================
    // =====================================
    // Using reverse proxy Nginx in production


    app.get('/', loginRequired, function(req, res) {
        let firstMenu = _.get(menus, "[0]");
        if (firstMenu) {
            let url = _.get(firstMenu, "url") || 
                (_.get(firstMenu, "urlbase") + _.get(firstMenu, "items[0].url"));
            res.redirect(url);
        } else res.render('index');
    });


    // =====================================
    // CRUD Pages ==========================
    // =====================================
    let filepaths = glob.sync('server/models/*/*.config.json');
    _.each(filepaths, path => {
        let modelPaths = path.split('server/models/');
        let tailPathSplits = modelPaths[1].split('/');
        let modelName = tailPathSplits[0];
        let actionName = tailPathSplits[1].split(".")[0];
        if (!layoutNamespace[modelName]) layoutNamespace[modelName] = {};
        layoutNamespace[modelName][actionName] = require(path.replace("server/", "../"));
    });

    _.each(layoutNamespace, (actions, modelName) => {
        _.each(actions, (layouts, actionName) => {
            const singleName = pluralize.singular(modelName);
            const singleCap = utils.capitalize(singleName);
            let currentPath = [modelName, actionName].join('/'),
                renderPath = currentPath,
                isList = actionName == "_list";
            if (isList) currentPath = [modelName, ""].join('/');
            app.get('/' + currentPath, loginRequired, (function(path, layout, model, action){
                if ( action == "_list" ) {
                    return async function(req, res, next) {
                        const fields = collectFields(layout);
                        const transferFields = _.filter(fields, function(fd){ return fd.type == "json" });
                        const fileFields = _.filter(fields, fd => fd.type == "image-file" || fd.type == "file");
                        let query = {};
                        if(!_.isEmpty(layout.filters)) query._filters = layout.filters;
                        interface["get" + utils.capitalize(model)](query)
                            .then(function(results){
                                // do decode here
                                let mutableData = results;
                                _.each(mutableData, function(result){
                                    _.each(transferFields, function(fd){
                                        let datalist = result[fd.name] || [];
                                        let imageFiles = _.filter(fd.fields, f => f.type == "image-file" );
                                        let strings = _.filter(fd.fields, f => f.type == "video-url" );
                                        let mutableList = _.map(datalist, function(data){
                                            let newData = {};
                                            _.each(imageFiles, function(f){
                                                if (data[f.name]) {
                                                    newData.src = newData.link = data[f.name].url;
                                                    newData.type = 'image';
                                                }
                                            });
                                            _.each(strings, function(f){
                                                if (data[f.name]) {
                                                    newData.src = getYoutubeThumbnail(data[f.name]);
                                                    newData.link = data[f.name];
                                                    newData.type = 'video';
                                                }
                                            });
                                            return _.isEmpty(newData) ? data : newData;
                                        });
                                        result[fd.name] = mutableList;
                                    });
                                    _.each(fileFields, fd => {
                                        let val = result[fd.name];
                                        if (!val || !val.url) result[fd.name].url = "";
                                    });
                                });
                                res.render(path, {
                                    layouts: layout,
                                    data: mutableData
                                });
                            })
                            .catch(next);
                    };
                } else {
                    return async function(req, res){
                        const fields = collectFields(layout);
                        res.render(path, { 
                            layouts: layout, 
                            data: { _relateds: await getRelatedData(fields) }
                        } );
                    };
                }
            })(renderPath, layouts, modelName, actionName) );

            if (isList) {
                // =====================================
                // AJAX ================================
                // =====================================
                app.put(`/${modelName}/:id/ajax/update`, loginRequired, function(req, res, next){
                    const lookid = req.params.id;
                    const fields = collectFields(layouts);
                    const booleanFields = _.filter(fields, function(fd){ return fd.type == "boolean" });
                    const mutableData = _.cloneDeep(req.body);
                    
                    _.each(booleanFields, fd => {
                        let targetVal = mutableData[fd.name];
                        mutableData[fd.name] = utils.parseBoolean(targetVal, fd.defaultValue);
                    });

                    interface[`update${singleCap}`](lookid, mutableData)
                        .then(function(){ sendOk(res) })
                        .catch(next);
                });
                app.delete(`/${modelName}/:id/ajax/delete`, loginRequired, function(req, res, next){
                    const lookid = req.params.id;
                    interface[`remove${singleCap}`](lookid)
                        .then(function(){ sendOk(res) })
                        .catch(next);
                });
            } else if (actionName == "create") {
                app.post(`/${modelName}/create`, loginRequired, function(req, res){
                    const fields = collectFields(layouts);
                    const transferFields = _.filter(fields, function(fd){ return fd.type == "json" });
                    const secreteFields = _.filter(fields, function(fd){ return fd.type == "password" });
                    const booleanFields = _.filter(fields, function(fd){ return fd.type == "boolean" });
                    const fileFields = _.filter(fields, fd => fd.type == "image-file" || fd.type == "file");
                    let mutableData = _.cloneDeep(req.body);
                    let fileHandler = new FileHandler(modelName);

                    _.each(transferFields, fd => {
                        let targetVal = mutableData[fd.name];
                        if ( Array.isArray(targetVal) ) {
                            // find the files fields
                            let fileNames = _.map(
                                _.filter(fd.fields, inf => { 
                                    return inf.type == "image-file" || inf.type == "file";
                                }),
                                o => o.name
                            );
                            // find file field in json and collect them
                            _.each(fileNames, name => {
                                _.each(mutableData[fd.name], tuple => {
                                    const val = tuple[name];
                                    if ( typeof val == 'object' && utils.isDataURL(val.dataurl) ) {
                                        fileHandler.add(tuple, name);
                                    }
                                })
                            });
                        } else if (typeof targetVal == "undefined" || targetVal == "") {
                            // defaults
                            mutableData[fd.name] = {};
                        }
                    });

                    _.each(secreteFields, fd => {
                        let targetVal = mutableData[fd.name];
                        mutableData[fd.name] = md5(targetVal);
                    });

                    _.each(booleanFields, fd => {
                        let targetVal = mutableData[fd.name];
                        mutableData[fd.name] = utils.parseBoolean(targetVal, fd.defaultValue);
                    });

                    _.each(fileFields, fd => {
                        var val = mutableData[fd.name];
                        if ( typeof val == 'object' && utils.isDataURL(val.dataurl) ) {
                            fileHandler.add(mutableData, fd.name, "file");
                        }
                    });

                    mergeCollectionRelateds(fields, mutableData)
                        .then(() => fileHandler.exec())
                        .then(() => interface[`create${singleCap}`](mutableData))
                        .then(() => res.redirect(`/${modelName}/`))
                        .catch(function(err){ console.log(err) });
                });
            }

            // other routes
            let validRoutes = _.filter(
                layouts.otherRoutes || [], 
                r => r.path == ":id/update" && (r.method == "get" || r.method == "put")
            );
            _.each(validRoutes, r => {
                if (r.method == "get") {
                    app[r.method](`/${modelName}/${r.path}`, loginRequired, function(req, res, next){
                        const lookid = req.params.id;
                        const fields = collectFields(layouts);
                        const fileFields = _.filter(fields, fd => fd.type == "image-file" || fd.type == "file");

                        interface[`get${singleCap}`]({ id: lookid })
                            .then(results => {
                                if ( results && results.length ){
                                    let mutableData = results[0];

                                    _.each(fileFields, fd => {
                                        let val = mutableData[fd.name];
                                        mutableData[fd.name] = (val && val.url) ? val.url : "";
                                    });

                                    res.render(`${modelName}/${r.path.replace(":","_")}`, { 
                                        layouts: layouts,
                                        data: mutableData
                                    } );
                                } else notFound(res);
                            })
                            .catch(next);
                    });
                } else if (r.method == "put") {
                    // app.put('/sharings/:id/update', loginRequired, function(req, res, next){
                    app[r.method](`/${modelName}/${r.path}`, loginRequired, function(req, res, next){
                        const lookid = req.params.id;
                        const fields = collectFields(layouts);
                        const fileFields = _.filter(fields, fd => fd.type == "image-file" || fd.type == "file");
                        let fileHandler = new FileHandler(modelName);
                        let mutableData = _.cloneDeep(req.body);
                        let hasUploadNames = [];

                        _.each(fileFields, fd => {
                            var val = mutableData[fd.name];
                            if ( typeof val == 'object' && utils.isDataURL(val.dataurl) ) {
                                fileHandler.add(mutableData, fd.name);
                                hasUploadNames.push(fd.name);
                            } else {
                                delete mutableData[fd.name];
                            }
                        });

                        let promiseChain = mergeCollectionRelateds(fields, mutableData);

                        if (hasUploadNames.length) {
                            promiseChain = promiseChain
                                .then(() => interface[`get${singleCap}`]({ id: lookid }))
                                .then(results => {
                                    if ( results && results.length ){
                                        const oldData = results[0];
                                        _.each(hasUploadNames, name => {
                                            const val = oldData[name];
                                            if (val && val.id) fileHandler.remove(oldData, name);
                                        });
                                    }
                                })
                                .then(() => fileHandler.exec());
                        }

                        promiseChain
                            .then(() => interface[`update${singleCap}`](lookid, mutableData))
                            .then(() => res.redirect(`/${modelName}/`))
                            .catch(next);
                    });
                }
            });
        });
    });

    app.get('/photos/batchcreate', loginRequired, function(req, res){
        res.render('photos/batchcreate');
    });

    app.post('/photos/ajax/batchcreate', loginRequired, function(req, res, next){
        const fields = collectFields(photos_createLayout);
        const fileFields = _.filter(fields, fd => fd.type == "image-file" || fd.type == "file");
        let mutableData = {};

        if (fileFields.length) {
            let fileType = req.header("Content-Type"),
                fileName = req.query['flowFilename'],
                fieldName = fileFields[0].name;
                data = [];

            req.on('error', err => {
                console.error(err);
                badRequest(res);
            })
            .on('data', function(binData){
                data.push(binData);
            })
            .on('end', function(){
                var buffer = Buffer.concat(data);

                mutableData[fieldName] = {
                    name: fileName,
                    dataurl: `data:${fileType};base64,${buffer.toString('base64')}`
                };
                
                // to upload
                const fileHandler = new FileHandler("photos");

                fileHandler.add(mutableData, fieldName);
                
                fileHandler.exec()
                    .then(() => interface.createPhoto(mutableData))
                    .then(() => res.send("OK"))
                    .catch(next);
            });
        }
    });

    app.get('/clients/:id/detail', loginRequired, function(req, res, next){
        const lookid = req.params.id;

        interface.getClient({ id: lookid })
            .then(function(results){
                if ( results && results.length ){
                    let mutableData = results[0];
                    res.render('clients/_id/detail', { 
                        // layouts: items_createLayout,
                        data: mutableData
                    } );
                } else notFound(res);
            })
            .catch(next);
    });

    app.get('/clients/uniquecheck/:field/:value', loginRequired, function(req, res, next){
        const field = req.params.field;
        const value = req.params.value;
        const params = {};
        params[field] = value;
        interface.getClient(params)
            .then(function(results){
                if ( results && results.length ) res.send("fail");
                else res.send("ok");
            })
            .catch(next);
    });

    app.get('/items/:id/update', loginRequired, function(req, res, next){
        const lookid = req.params.id,
            fields = collectFields(items_createLayout),
            transferFields = _.filter(fields, function(fd){ return fd.type == "json" }),
            integerFields = _.filter(fields, function(fd){ return fd.type == "integer" });

        interface.getItem({ id: lookid })
            .then(async function(results){
                if (!results.length) return Promise.reject(notFound(res));
                let relatedData = await getRelatedData(fields);
                let mutableData = results[0];
                _.each(transferFields, function(fd){
                    _.each(mutableData[fd.name] || [], function(data){
                        var imageFiles = _.filter(fd.fields, f => f.type == "image-file" );
                        var strings = _.filter(fd.fields, f => f.type == "video-url" );
                        var selections = _.filter(fd.fields, f => f.type == "string" && f.layout == "selection" );
                        _.each(imageFiles, function(f){
                            if (data[f.name]) data[f.name] = data[f.name].url;
                        });
                        _.each(strings, function(f){
                            if (data[f.name]) data[f.name] = getYoutubeThumbnail(data[f.name]);
                        });
                        _.each(selections, function(f){
                            if (data[f.name]) data[f.name] = findSelectionLabel(data[f.name], relatedData[f.related]);
                        });
                    });
                });
                _.each(integerFields, function(fd){
                    if (mutableData[fd.name] == 0) mutableData[fd.name] = '';
                });
                mutableData._relateds = relatedData;
                res.render('items/_id/update', { 
                    layouts: items_createLayout,
                    data: mutableData
                } );
            })
            .catch(next);
    });

    app.get('/orders/:id/update', loginRequired, function(req, res, next){
        const lookid = req.params.id;

        interface.getOrderWithDetails({ id: lookid})
            .then(function(results){
                if ( results && results.length ){
                    let mutableData = results[0];

                    mutableData.itemCount = mutableData.details.length;
                    mutableData.totalAmount = mutableData.advancePayment + mutableData.finalPayment;

                    let phone = mutableData.ownClient.phone,
                        cellphone = mutableData.ownClient.cellphone;

                    mutableData.ownClient.combinePhone = ( phone && cellphone ) ? [phone, cellphone].join(" / ") : (phone || cellphone);

                    mutableData.details.sort( (a, b) => { 
                        if ( a.parentDetail && b.parentDetail ) {
                            if ( a.parentDetail < b.parentDetail ) return -1;
                            else if ( a.parentDetail == b.parentDetail ) return (a.id < b.id) ? -1 : 1;
                            else return 1;
                        } else if ( !a.parentDetail && b.parentDetail ) {
                            if ( a.id <= b.parentDetail ) return -1;
                            else return 1;
                        } else if ( a.parentDetail && !b.parentDetail ) {
                            if ( a.parentDetail <= b.id ) return -1;
                            else return 1;
                        } else {
                            if ( a.id < b.id ) return -1;
                            else return 1;
                        }
                    } );

                    mutableData.details.forEach((detail) => {
                        detail.statusSelection = detailStatusOptions.map((op) => {
                            return {
                                value: op,
                                selected: detail.status == op
                            };
                        });
                    });

                    res.render('orders/_id/update', { 
                        // layouts: items_createLayout,
                        data: mutableData
                    } );
                } else notFound(res);
            })
            .catch(next);
    });

    app.put('/items/:id/update', loginRequired, function(req, res, next){
        const lookid = req.params.id;
        const fields = collectFields(items_createLayout);
        const transferFields = _.filter(fields, function(fd){ return fd.type == "json" });
        const collectionFields = _.filter(fields, function(fd){ return fd.type == "collection" });
        const fileHandler = new FileHandler("items");
        let mutableData = _.cloneDeep(req.body);

        interface.getItem({ id: lookid })
            .then(function(results){
                if (!results.length) return Promise.reject(badRequest(res));

                let old = results[0];

                _.each(transferFields, fd => {
                    if ( Array.isArray(old[fd.name]) ) {
                        let oldList = old[fd.name].slice(0);
                        let fileNames = _.map(
                            _.filter(fd.fields, inf => { 
                                return inf.type == "image-file" || inf.type == "file";
                            }),
                            o => o.name
                        );

                        let handshakes = _.map(mutableData[fd.name] || [], function(data){
                            if ( typeof data._order !== "undefined" && oldList[data._order] ) {
                                var orderIdx = parseInt(data._order);
                                var theOld = oldList[orderIdx];
                                // remove the prop
                                delete data._order;

                                _.each(fileNames, name => {
                                    if ( data[name] && utils.isDataURL(data[name].dataurl) && theOld[name] && theOld[name].id ) {
                                        fileHandler.remove(theOld, name);
                                    }
                                    else data[name] = theOld[name];
                                });

                                data = _.merge({}, theOld, data);

                                oldList.splice(orderIdx, 1, undefined);
                            }
                            return data;
                        });

                        let oldRemoves = oldList.filter(function(o){ return !!o; });
                        
                        // find file field in json and collect them
                        _.each(fileNames, name => {
                            _.each(handshakes, tuple => {
                                const val = tuple[name];
                                if ( typeof val == 'object' && utils.isDataURL(val.dataurl) ) {
                                    fileHandler.add(tuple, name);
                                }
                            });
                            _.each(oldRemoves, tuple => {
                                const val = tuple[name];
                                if ( typeof val == 'object' && val.id ) {
                                    fileHandler.remove(tuple, name);
                                }
                            });
                        });

                        mutableData[fd.name] = handshakes;
                    }
                });

                return mergeCollectionRelateds(fields, mutableData);
            })
            .then(function(){
                return fileHandler.exec();
            })
            .then(function(){
                return interface.updateItem(lookid, mutableData);
            })
            .then(function(){
                res.redirect('/items/');
            })
            .catch(next);
    });

    app.put('/orders/:id/update', loginRequired, function(req, res, next){
        const lookid = req.params.id;

        const originData = _.cloneDeep(req.body);

        let updateDetailList = [];

        _.each(_.keys(originData), key => {
            let keySplits = key.split("-status");
            if (keySplits.length > 1) {
                let detailId = parseInt(keySplits[0]);
                updateDetailList.push({
                    id: detailId,
                    status: originData[key]
                });
            }
        });

        let promises = [];

        if ( updateDetailList.length == _.filter(updateDetailList, d => d.status == "成品已確認").length ) {
            // change main order to 已完成
            promises.push(interface.updateOrder(lookid, { status: "已完成" }));
        }

        promises.push(
            Promise.all(
                _.map(updateDetailList, dl => interface.updateOrderdetail(dl.id, { status: dl.status })
            ))
        );

        Promise.all(promises)
            .then(function(){
                res.redirect('/orders/' +  lookid + '/update');
            })
            .catch(next);
    });



    // =====================================
    // Authentication ======================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {
        if ( req.isAuthenticated() ) {
            res.redirect( decodeURIComponent(req.query.next || "/") );
        } else {
            // render the page and pass in any flash data if it exists
            res.render('login', { message: req.flash('message'), next: decodeURIComponent(req.query.next || "/") });
        }
    });
    // show the logout view
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });

    // process the login form
    app.post('/login', 
        passport.authenticate('local-login', {
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }), function(req, res){
            res.redirect( decodeURIComponent(req.body.next || "/") );
        });
};
