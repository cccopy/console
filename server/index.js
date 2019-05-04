var express = require('express');
var app = express();
var http = require('http');
var passport = require('passport');

var isDev = process.env.NODE_ENV === 'development';

if (isDev) {
}

require('./config/passport')(passport); // pass passport for configuration

require('./config/express')(app, passport);

require('./config/routes')(app, passport);

var server = http.createServer(app).listen(app.get('port'));

