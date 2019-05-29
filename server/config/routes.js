/**
 * Routes for express app
 */
var path = require('path');
var utils = require('../services/utils');
var interface = require('../services/interface');
var nunjucks = require('nunjucks');
var isDev = process.env.NODE_ENV === 'development';
var _ = require('lodash');
var FileHandler = require('../services/file-handler');

// views model
var menus = require('../models/menus.config.json');
var widgets = require('../models/widgets.config.json');

var createLayout = require('../models/items/create.config.json');
var _listLayout = require('../models/items/_list.config.json');

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

function notFound(res){ res.status(404).send("Not found."); }
function badRequest(res){ res.status(400).send("Bad request."); }

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

    nunEnv.addGlobal("menus", menus);
    nunEnv.addGlobal("widgets", widgets);

    // =====================================
    // Static Files ========================
    // =====================================
    // Using reverse proxy Nginx in production


    app.get('/', loginRequired, function(req, res) {
        res.render('index');
    });


    // =====================================
    // CRUD Pages ==========================
    // =====================================
    app.get('/items/create', loginRequired, function(req, res){
        res.render('items/create', { 
            path: '/items/create', layouts: createLayout
        } );
    });
    app.post('/items/create', loginRequired, function(req, res){
        const fields = collectFields(createLayout);
        let mutableData = _.cloneDeep(req.body);
        let shouldUploads = [];
        let fileHandler = new FileHandler("items");
        fields.forEach(function(fd){
            if (fd.type == "json") {
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
            }
        });
        
        fileHandler.exec()
            .then(function(){ return interface.createItem(mutableData) })
            .then(function(result){ res.redirect('/items/'); })
            .catch(function(err){ console.log(err) });
    });

    app.get('/items/', loginRequired, function(req, res, next){
        var fields = collectFields(_listLayout);
        var transferFields = _.filter(fields, function(fd){ return fd.type == "json" });
        interface.getItems()
            .then(function(results){
                // do decode here
                var mutableData = results;
                _.each(mutableData, function(result){
                    _.each(transferFields, function(fd){
                        var datalist = result[fd.name] || [];
                        var imageFiles = _.filter(fd.fields, f => f.type == "image-file" );
                        var strings = _.filter(fd.fields, f => f.type == "video-url" );
                        var mutableList = _.map(datalist, function(data){
                            var newData = {};
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
                            return newData;
                        });
                        result[fd.name] = mutableList;
                    });
                });
                res.render('items/_list', { path: '/items/', layouts: _listLayout, data: mutableData });
            })
            .catch(next);
    });
    app.get('/items/:id/update', loginRequired, function(req, res, next){
        var lookid = req.params.id,
            fields = collectFields(createLayout),
            transferFields = _.filter(fields, function(fd){ return fd.type == "json" });
            integerFields = _.filter(fields, function(fd){ return fd.type == "integer" });

        interface.getItem({ id: lookid })
            .then(function(results){
                if (!results.length) return notFound(res);
                var mutableData = results[0];
                _.each(transferFields, function(fd){
                    _.each(mutableData[fd.name] || [], function(data){
                        var imageFiles = _.filter(fd.fields, f => f.type == "image-file" );
                        var strings = _.filter(fd.fields, f => f.type == "video-url" );
                        _.each(imageFiles, function(f){
                            if (data[f.name]) data[f.name] = data[f.name].url;
                        });
                        _.each(strings, function(f){
                            if (data[f.name]) data[f.name] = getYoutubeThumbnail(data[f.name]);
                        });
                    });
                });
                _.each(integerFields, function(fd){
                    if (mutableData[fd.name] == 0) mutableData[fd.name] = '';
                });
                res.render('items/_id/update', { path: '/items/' + lookid + '/update', 
                    layouts: createLayout,
                    data: mutableData
                } );
            })
            .catch(next);
    });

    app.put('/items/:id/update', loginRequired, function(req, res, next){
        const lookid = req.params.id;
        const fields = collectFields(createLayout);
        const transferFields = _.filter(fields, function(fd){ return fd.type == "json" });
        const fileHandler = new FileHandler("items");
        let mutableData = _.cloneDeep(req.body);

        interface.getItem({ id: lookid })
            .then(function(results){
                if (!results.length) return badRequest(res);

                let old = results[0];

                _.each(transferFields, fd => {
                    if ( Array.isArray(old[fd.name]) ) {
                        let handshakes = [];
                        let oldList = old[fd.name].slice(0);
                        _.each(mutableData[fd.name] || [], function(data){
                            if ( typeof data._order !== "undefined" && oldList[data._order] ) {
                                handshakes.push(oldList[data._order]);
                                oldList.splice(parseInt(data._order), 1, undefined);
                            } else handshakes.push(data);
                        });

                        let oldRemoves = oldList.filter(function(o){ return !!o; });
                        let fileNames = _.map(
                            _.filter(fd.fields, inf => { 
                                return inf.type == "image-file" || inf.type == "file";
                            }),
                            o => o.name
                        );
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
