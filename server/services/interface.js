var axios = require('axios');
var md5 = require('md5');
var constants = require('../config/constants.json');

module.exports = {
	validUser: function(email, password){
		return new Promise(function(resolve, reject){
			axios.get(constants.api.getUser, {
				email: email,
				password: md5(password)
			})
			.then(function(users){
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
