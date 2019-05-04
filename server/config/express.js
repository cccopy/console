const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
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

	if(isProduction) {
		// temprorary did it like this, because we dont have DB yet.
		app.use(session({
			secret: '3EdCvFr$5TgBnHy^7Ujm',
			resave: false,
			cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
		})); // session secret  
	}else{
		app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret  
	}

	if ( !isProduction ) {
		app.use('/assets', express.static(path.join(__dirname, '../..', 'assets')));
	}

	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	
	app.use(flash()); 

	app.use(cookieParser());
	app.use(bodyParser.urlencoded({limit: '100mb', extended: true})); // for parsing application/x-www-form-urlencoded
	app.use(bodyParser.json({limit: '100mb'}));

	// common ejs properties
	// app.use(function(req, res, next){
	//   res.locals.isDev = !isProduction;
	//   res.locals.login = req.isAuthenticated();
	//   next();
	// }); 

	console.log('--------------------------');
	console.log('===> 😊  Starting Console Server . . .');
	console.log('===>  Environment: ' + node_env);

};
