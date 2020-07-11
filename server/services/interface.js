var axios = require('axios');
var _ = require('lodash');
var request = require('request');
var md5 = require('md5');
var api = require('../config/constants.json').api;
const methods = require('../models/methods.config.json');

const pluralize = require('pluralize');
const capitalize = require('./utils').capitalize;

var axiosIns = axios.create({
	baseURL: api.base,
	timeout: api.timeout,
	headers: { 
		"Authorization": "Bearer " + api.token,
		"Content-Type": "application/json; charset=UTF-8"
	}
});

var uploadOptions = {
	url: api.base + methods._files.add,
	method: 'POST',
	headers: { "Authorization": "Bearer " + api.token }
};

const generatedMethods = (() => {
	const validKeys = _.filter(methods, (v, k) => k[0] != "_");
	let res = {};
	_.each(validKeys, k => {
		const isPlural = pluralize.isPlural(k);
		const pluralizeName = isPlural ? k : pluralize(k);
		const pluralizeCap = capitalize(pluralizeName);
		const singleName = isPlural ? pluralize.singular(k) : k;
        const singleCap = capitalize(singleName);
		// get single
		res[`get${singleCap}`] = function(condition){
			let params = { ...condition };
			return new Promise((resolve, reject) => {
				axiosIns.get(methods[pluralizeName], { params: params })
					.then(response => resolve(response.data))
					.catch(err => reject(err));
			});
		};
		// get plural
		res[`get${pluralizeCap}`] = function(query){
			let params = { _limit: -1 };
			query = query || {};
			if (typeof query.offset !== "undefined") params._start = query.offset;
			if (typeof query.limit !== "undefined") params._limit = query.limit;
			return new Promise((resolve, reject) => {
				axiosIns.get(methods[pluralizeName], { params: params })
					.then(response => resolve(response.data))
					.catch(err => reject(err));
			});
		};
		// create single
		res[`create${singleCap}`] = function(data){
			return new Promise((resolve, reject) => {
				axiosIns.post(methods[pluralizeName], data)
					.then(response => resolve(response.data))
					.catch(err => reject(err));
			});
		};
		// update single
		res[`update${singleCap}`] = function(id, data){
			return new Promise((resolve, reject) => {
				axiosIns.put(`${methods[pluralizeName]}/${id}`, data)
					.then(response => resolve(response.data))
					.catch(err => reject(err));
			});	
		};
		// remove single
		res[`remove${singleCap}`] = function(id){
			return new Promise((resolve, reject) => {
				axiosIns.delete(`${methods[pluralizeName]}/${id}`)
					.then(response => resolve())
					.catch(err => reject(err));
			});
		};
	});
	return res;
})();

const additionMethods = {
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
	removeFile: function(id){
		return new Promise(function(resolve, reject){
			axiosIns.delete(methods._files.remove + "/" + id)
				.then(function(response){ resolve(response.data); })
				.catch( err => reject(err) );
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
	getItems: function(query){
		var params = { _limit: -1, itemType: "normal" };
		query = query || {};
		if (typeof query.offset !== "undefined") params._start = query.offset;
		if (typeof query.limit !== "undefined") params._limit = query.limit;
		return new Promise(function(resolve, reject){
			axiosIns.get(methods.items, { params: params })
				.then(function(response){
					let results = response.data;
					if ( !_.isEmpty(query._filters) ) {
						// OR
						let props = _.keys(query._filters);
						results = _.filter(results, result => {
							for(let p = 0, plen = props.length; p < plen; p++) {
								let k = props[p];
								if ( _[query._filters[k]](result[k]) ) return true;
							}
						});
					}
					resolve(results);
				})
				.catch( err => reject(err) );
		});
	},
	getOrderWithDetails: function(condition){
		var params = {};
		if (typeof condition.id !== "undefined") params.id = condition.id;
		return new Promise(function(resolve, reject){
			axiosIns.get(methods.orders, { params: params })
				.then(function(response){ resolve(response.data); })
				.catch( err => reject(err) );
		});
	}
};

module.exports = Object.assign({}, generatedMethods, additionMethods);
