
const uploadFiles = require('./interface').uploadFiles;
const removeFile = require('./interface').removeFile;
const convertS3Url = require('./utils').convertS3Url;

class FileHandler {
	constructor(path) {
		this._adds = [];
		this._removes = [];
		this._path = path || "";
	}
	add(target, key, type) {
		this._adds.push( { with: key, data: target } );
		return this;
	}
	remove(target, key) {
		this._removes.push( { with: key, data: target } );
		return this;
	}
	exec() {
		let self = this;

		let toAdds = self._adds.map( o => {
			return o.data[o.with];
		});
		let toRemoves = self._removes.map( o => {
			return o.data[o.with];
		});

		let totalPromises = [];

		totalPromises.push(
			toAdds.length ? 
				uploadFiles(toAdds, self._path)
				.then( results => {
					let res = results.map((result, idx) => {
						let o = self._adds[idx];
						o.data[o.with] = {
							id: result.id,
							name: result.name,
							mime: result.mime,
							size: result.size,
							url: convertS3Url(result.url)
						};
						return o;
					});
					// reset
					self._adds = [];
					return res;
				})
			: []
		);
		
		totalPromises.push(
			toRemoves.length ? 
				Promise.all(
					toRemoves.map( r => { return removeFile(r.id) } )
				).then( results => {
					let res = results.map((result, idx) => {
						let o = self._removes[idx];
						o.data[o.with] = null;
						return o;
					});
					// reset
					self._removes = [];
					return res;
				})
			: []	
		);
		
		return Promise.all(totalPromises);
	}
}

module.exports = FileHandler;
