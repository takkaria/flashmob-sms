'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const request = require('request');
const ip = require('ip');

// ====== Initialisation

function abort(text) {
	console.log('ERROR: ', text);
	process.exit(1);
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))

if (!process.env.ALLOWED_NUMBERS)
	process.env.ALLOWED_NUMBERS = '';
if (!process.env.API_KEY)
	abort('No API key specified - aborting')

// Enabled as we're deploying on Heroku
app.set('trust proxy', true);


// ====== App code

let responseText = 'Testing';
let responseOn = false;

function getKeyword(str) {
	if (str) {
		let arr = str.split(' ');
		return arr[0];
	}
}

const clockworkIPs = [
	ip.cidrSubnet('89.248.48.192/27'),
	ip.cidrSubnet('89.248.58.16/28')
];
function checkIP(req) {
	for (let i = 0; i < clockworkIPs.length; i++) {
		let mask = clockworkIPs[i];
		if (mask.contains(req.ip))
			return true;
	}

	return false;
}

function checkAccess(from) {
	return process.env.ALLOWED_NUMBERS.includes(from);
}

function success(res) {
	return () => {
		res.status(200);
		res.send('OK');
	}
}

app.post('/', function (req, res) {

	// Restrict requests to only those specified by Clockwork
	// https://www.clockworksms.com/doc/reference/faqs/our-ip-addresses/
	if (process.env.RESTRICT_IP === '1' && !checkIP(req)) {
		res.status(401);
		res.send('Access denied');
		return;
	}

	let message;
	if (responseOn)
		message = responseText;

	if (checkAccess(req.body.from)) {
		let incomingMsg = req.body.content;
		let keyword = getKeyword(incomingMsg);

		if (keyword == 'update') {
			// Extract from after the space after 'update'
			responseText = incomingMsg.substr(7);
			message = 'Message updated to: ' + responseText;
		} else if (keyword == 'on') {
			responseOn = true;
			message = 'Auto-responder now turned on';
		} else if (keyword == 'off') {
			responseOn = false;
			message = 'Auto-responder now turned off';
		}
	}

	if (message) {
		request
			.post('https://api.clockworksms.com/http/send.aspx')
			.form({
				key: process.env.API_KEY,
				to: req.body.from,
				long: 1,
				content: message
			})
			.on('response', success(res));
	} else {
		success(res)();
	}
});


// ====== Either run (if run directly) or export as a module

function start(fn) {
	const port = process.env.PORT || 3000;
	app.listen(port, function () {
		if (fn) {
			fn(null, port);
		}
	});
}

if (require.main === module) {
	start((err, port) => console.log('Listening on port ' + port));
}

module.exports = start;
