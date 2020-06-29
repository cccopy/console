
const url = require('url');
const md5 = require('md5');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const strkey = require('../config/constants.json').sessionKey;

var s3re = new RegExp("^.+amazonaws\\.com/(.+)$");

function lessTenAddZero(v) { return v < 10? ("0" + v) : v; };

function isDataURL(s) {
    return s && !!s.match(isDataURL.regex);
}
isDataURL.regex = /^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*)\s*$/i;

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

exports.isDataURL = isDataURL;

exports.convertS3Url = function(s3url){
	var matches;
	if ( matches = s3url.match(s3re) ) {
		return "https://" + matches[1];
	}
	return s3url;
};

exports.dateToNormalFormat = function(dte, split){
	split = split || "/";
	var year = dte.getUTCFullYear(),
		month = dte.getUTCMonth() + 1,
		day = dte.getUTCDate();
	return [year.toString(), lessTenAddZero(month), lessTenAddZero(day)].join(split);
};

exports.tupleNumbers = function(tuples){
	return tuples.length.toString();
};

exports.parseBoolean = function(boolValue, defaultValue){
	const booleanValidValues = [true, false, "true", "false", 1, 0];
	let valIdx = booleanValidValues.indexOf(boolValue);
    if (valIdx == -1 && typeof defaultValue !== "undefined") {
        valIdx = booleanValidValues.indexOf(defaultValue);
    }
    valIdx = valIdx == -1 ? 0 : valIdx;
    return valIdx % 2 == 0;
};

exports.booleanText = function(boolValue){
	return boolValue ? "是" : "否";
};
