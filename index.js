'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const request = require('request');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))

function getKeyword(str) {
	if (str) {
		let arr = str.split(' ');
		return arr[0];
	}
}

app.post('/', function (req, res) {
	let keyword = getKeyword(req.body.content);
	let responseText;

	if (keyword == 'update') {
		responseText = req.body.content;
	}

	request
		.post('https://api.clockworksms.com/http/send.aspx')
		.form({
			to: req.body.from,
			content: responseText
		})
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
