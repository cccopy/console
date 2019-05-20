/**
 * Routes for express app
 */
var path = require('path');
var utils = require('../services/utils');
var interface = require('../services/interface');
var nunjucks = require('nunjucks');
var isDev = process.env.NODE_ENV === 'development';

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
            path: '/items/create', layouts: createLayout, 
            data: {
                keywords: [
                    { value: "test1", label: "TEST1"},
                    { value: "test2", label: "TEST2"},
                    { value: "test3", label: "TEST3", selected: true},
                    { value: "test4", label: "TEST4"}
                ],
                scenario: [
                    { label: "爛", description: "shit" }
                ]
            }
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
        fields.forEach(function(f){
            if(f.name) console.log(req.body[f.name]);
        });

        if (req.xhr) {
            res.send({ url: '/items/' });
        } else {
            res.redirect('/items/');
        }
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
