'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const request = require('request');

// ====== Init Express

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))


// ====== App code

let responseText = 'Testing';

if (!process.env.ALLOWED_NUMBERS)
	process.env.ALLOWED_NUMBERS = '';

function getKeyword(str) {
	if (str) {
		let arr = str.split(' ');
		return arr[0];
	}
}

function checkAccess(from) {
	return process.env.ALLOWED_NUMBERS.includes(from);
}

app.post('/', function (req, res) {

	if (checkAccess(req.body.from)) {
		let incomingMsg = req.body.content;
		let keyword = getKeyword(incomingMsg);

		if (keyword == 'update') {
			// Extract from after the space after 'update'
			responseText = incomingMsg.substr(7);
		}
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


// ====== Either run (if run directly) or export as a module

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
