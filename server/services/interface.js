var axios = require('axios');
var md5 = require('md5');
var api = require('../config/constants.json').api;

var axiosIns = axios.create({
	baseURL: api.base,
	timeout: api.timeout,
	headers: { "Authorization": "Bearer " + api.token }
});

var methods = api.methods;

module.exports = {
	validUser: function(email, password){
		return new Promise(function(resolve, reject){
			axiosIns.get(methods.getUser, {
				email: email,
				password: md5(password)
			})
			.then(function(response){
				const users = response.data;
				if (users && users.length == 1) {
					resolve(users[0]);
				} else {
					reject("email or password is not correct.");
				}
			})
			.catch( err => reject(err) );
		});
	}
}
