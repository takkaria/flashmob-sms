'use strict';

const express = require('express');
const request = require('request');

const app = express();

app.post('/', function (req, res) {
	request
		.post('https://api.clockworksms.com/http/send.aspx')
		.on('response', response => {
			res.status(200);
			res.send('OK');
		});
});

function start(fn) {
	const port = process.env.PORT || 3000;
	app.listen(port, function () {
		console.log('Listening on port ' + port);
		if (fn) {
			fn();
		}
	});
}

if (require.main === module) {
	start();
}

module.exports = start;
