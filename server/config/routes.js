/**
 * Routes for express app
 */
var path = require('path');
var utils = require('../services/utils');
var interface = require('../services/interface');
var nunjucks = require('nunjucks');
var isDev = process.env.NODE_ENV === 'development';
var _ = require('lodash');

// views model
var menus = require('../models/menus.config.json');
var widgets = require('../models/widgets.config.json');
var createLayout = require('../models/items/create.config.json');

// route middleware to make sure a user is logged in
function loginRequired(req, res, next) {
    // if user is authenticated in the session, carry on
    // if(process.env.NODE_ENV === 'development' || req.isAuthenticated()) return toNext();    
    if(req.isAuthenticated()) return next();

    // if they aren't redirect them to the home page
    res.redirect('/login?next=' + encodeURIComponent(req.originalUrl) );
}

module.exports = function(app, passport) {

    var nunEnv = nunjucks.configure(app.get('views'), {
        autoescape: true,
        watch: true,
        express: app
    });

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
        var layouts = createLayout;
        var fields = [];
        if (layouts.layout == "tabs") {
            fields = layouts.sections
                .map(function(sec){ return sec.fields; })
                .reduce(function(f1, f2){ return f1.concat(f2) }, []);
        } else {
            fields = layouts.fields;
        }
        let mutableData = _.cloneDeep(req.body);
        let shouldUploads = [];
        fields.forEach(function(fd){
            if (fd.type == "json") {
                let targetVal = mutableData[fd.name];
                if ( Array.isArray(targetVal) ) {
                    // find the files fields
                    let fileNames = _.map(
                        _.filter(fd.fields, inf => { 
                            return inf.type == "image" || inf.type == "file";
                        }),
                        o => o.name
                    );
                    // find file field in json and collect them
                    _.each(fileNames, name => {
                        _.each(mutableData[fd.name], tuple => {
                            const val = tuple[name];
                            if ( typeof val == 'object' && utils.isDataURL(val.dataurl) ) {
                                shouldUploads.push( { with: name, data: tuple } );
                            }
                        })
                    });
                } else if (typeof targetVal == "undefined" || targetVal == "") {
                    // defaults
                    mutableData[fd.name] = {};
                }
            }
        });

        var toUploads = shouldUploads.map(function(o){
            return o.data[o.with];
        });

        var postChain = Promise.resolve();
        if ( toUploads.length ) {
            postChain = interface.uploadFiles(toUploads, "items")
                .then(function(results){
                    _.each(results, function(result, idx){
                        let o = shouldUploads[idx];
                        // override
                        o.data[o.with] = {
                            id: result.id,
                            name: result.name,
                            mime: result.mime,
                            size: result.size,
                            url: utils.convertS3Url(result.url)
                        };
                    })
                });
        }

        postChain
            .then(function(){
                return interface.createItem(mutableData)
            })
            .then(function(result){
                console.log(result);
                if (req.xhr) {
                    res.send({ url: '/items/' });
                } else {
                    res.redirect('/items/');
                }
            })
            .catch(function(err){ console.log(err) });
    });

    app.get('/items/', loginRequired, function(req, res){
        res.render('items/_list', { path: '/items/' } );
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
