
const url = require('url');
const md5 = require('md5');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const strkey = require('../config/constants.json').sessionKey;

exports.getCookie = function(req){
	var res = null,
		cookiePairs = [];

	if(req && req.headers && req.headers.cookie)
		cookiePairs = req.headers.cookie.split(';');

	for(var idx = 0, len = cookiePairs.length; idx < len; idx++){
		var cookie = cookiePairs[idx];
		var parts = cookie.match(/(.*?)=(.*)$/);
		if(parts[1].trim() == strkey){
			res = (parts[2] || '').trim();
			break;
		}
	}
	return res;
};

exports.setCookie = function(res, strValue, milliseconds){
	res.cookie(strkey, strValue, {
        maxAge: milliseconds,
        httpOnly: true
    });
};

exports.getParamPairs = function(req){
	var requestUrl = url.parse(req.url),
		requestQuery = requestUrl.query,
		requestParams = requestQuery.split('&');
	params = {};
	for (i = 0; i <= requestParams.length; i++) {
		param = requestParams[i];
		if (param) {
			var p = param.split('=');
			if (p.length != 2) continue;
			params[p[0]] = decodeURIComponent(p[1]);
		}
	}
	return params;
};

exports.getToken = function(){
	return md5(uuidv4());
};

exports.base64_encode = function(file){
	// read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
};

