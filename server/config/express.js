const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const constants = require('./constants.json');


module.exports = function (app, passport) {
	var node_env = process.env.NODE_ENV;
	var isProduction = node_env === 'production';

	app.set('port', constants.port);

	// X-Powered-By header has no functional value.
	// Keeping it makes it easier for an attacker to build the site's profile
	// It can be removed safely
	app.disable('x-powered-by');
	app.set('case sensitive routing', true);
	app.set('views', path.join(__dirname, '..', 'views'));
	app.set('view cache', false);
	app.set('view engine', 'njk');

	app.use(session({ 
		secret: '3EdCvFr$5TgBnHy^7Ujm', 
		resave: false,
		cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true },
		saveUninitialized: true
	})); // session secret  

	// cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days

	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	
	app.use(flash()); 

	app.use(cookieParser());
	app.use(bodyParser.urlencoded({limit: '100mb', extended: true})); // for parsing application/x-www-form-urlencoded
	app.use(bodyParser.json({limit: '100mb'}));
	app.use(methodOverride(function (req, res) {
		if (req.body && typeof req.body === 'object' && '_M' in req.body) {
			var method = req.body._M;
			delete req.body._M;
			return method;
		}
	}));
	
	// common nunjucks properties
	app.use(function(req, res, next){
		res.locals.currentpath = req.path;
		res.locals.login = req.isAuthenticated();
		res.locals.username = res.locals.login ? req.user.username : "";
		next();
	});

	// for error handler
	app.use(function(err, req, res, next){
    	if (res.headersSent) {
			return next(err)
		}
		res.status(500)
		res.render('error', { error: err })
        console.error(err);
	});

	if ( !isProduction ) {
		app.use('/assets', express.static(path.join(__dirname, '../..', 'assets')));
	}
	// common ejs properties
	// app.use(function(req, res, next){
	//   res.locals.isDev = !isProduction;
	//   res.locals.login = req.isAuthenticated();
	//   next();
	// }); 

	// I am adding this here so that the Heroku deploy will work
	// Indicates the app is behind a front-facing proxy,
	// and to use the X-Forwarded-* headers to determine the connection and the IP address of the client.
	// NOTE: X-Forwarded-* headers are easily spoofed and the detected IP addresses are unreliable.
	// trust proxy is disabled by default.
	// When enabled, Express attempts to determine the IP address of the client connected through the front-facing proxy, or series of proxies.
	// The req.ips property, then, contains an array of IP addresses the client is connected through.
	// To enable it, use the values described in the trust proxy options table.
	// The trust proxy setting is implemented using the proxy-addr package. For more information, see its documentation.
	// loopback - 127.0.0.1/8, ::1/128
	app.set('trust proxy', 'loopback');

	console.log('--------------------------');
	console.log('===> 😊  Starting Console Server . . .');
	console.log('===>  Environment: ' + node_env);

};
