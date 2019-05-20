var axios = require('axios');
var _ = require('lodash');
var request = require('request');
var md5 = require('md5');
var api = require('../config/constants.json').api;
var methods = require('../models/methods.config.json');

var axiosIns = axios.create({
	baseURL: api.base,
	timeout: api.timeout,
	headers: { "Authorization": "Bearer " + api.token }
});

var uploadOptions = {
	url: api.base + methods.upload,
	method: 'POST',
	headers: { "Authorization": "Bearer " + api.token }
};

module.exports = {
	uploadFiles: function(files, path){
		var postFiles = files.map(function(file){
			// file.dataurl  "data:image/png;base64,xxxxxx"
			// file.name
			var urlSplits = file.dataurl.split(";base64,");
			return {
				value: Buffer.from(urlSplits[1], "base64"),
				options: {
					filename: file.name,
					contentType: urlSplits[0].split(":")[1]
				}
			}
		});

		return new Promise(function(resolve, reject){
			var options = _.merge({
				formData: {
					files: postFiles,
					path: path
				}
			}, uploadOptions);
			request(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					// Print out the response body
					resolve( JSON.parse(body) );
				}else{
					try {
						reject( JSON.parse(error || body) )
					} catch (e) {
						reject( (error || body).toString() )
					}
				}
			});
		});
	},
	validUser: function(email, password){
		return new Promise(function(resolve, reject){
			axiosIns.get(methods.users, {
				params: {
					email: email,
					password: md5(password)
				}
			})
			.then(function(response){
				const users = response.data;
				if (users && users.length == 1) {
					resolve(users[0]);
				} else {
					reject("email or password is not correct.");
				}
			})
			.catch( err => { reject(err); });
		});
	},
	createItem: function(data){
		return new Promise(function(resolve, reject){
			axiosIns.post(methods.items, data)
				.then(function(response){ resolve(response.data); })
				.catch( err => reject(err) );
		});
	}
}
