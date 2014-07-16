var readJson = require('read-package-json');

readJson('./package.json', console.error, false, function(er, data) {
	if(er) {
		console.log('there was an error',er);
		return;
	}
	console.log('the package data is', data);
});
