'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const request = require('request');
const debug = require('debug')('flashmob-sms');

const ipCheck = require('./lib/ip-check');
const numberStore = require('./lib/number-store')

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

// Add IP restrictor
app.use(ipCheck);


// ====== App code

let responseText = 'Testing';
let responseOn = false;

function getKeyword(str, shortcodeText) {
	let start = 0;

	// If we have shortcodeText, it means the message is of the form
	// 'keyword <command>'.  So we ignore the first token in the string
	// and instead jump ahead.
	if (shortcodeText) {
		start = 1;
	}

	if (str) {
		let arr = str.split(' ');
		return arr[start];
	}
}

function checkAccess(from) {
	return process.env.ALLOWED_NUMBERS.includes(from);
}

function success(res) {
	res.status(200);
	res.send('OK');
}

app.post('/', function (req, res) {
	let message;
	if (responseOn)
		message = responseText;

	debug('Received message from ' + req.body.from);
	debug('Message body: ', req.body.content);

	if (checkAccess(req.body.from)) {
		let incomingMsg = req.body.content;
		let keyword = getKeyword(incomingMsg, req.body.keyword);

		debug('Checking keyword');

		if (keyword == 'update') {
			// Extract from after the space after 'update'
			// XXX This won't work when using a shortcode
			responseText = incomingMsg.substr(7);
			message = 'Message updated to: ' + responseText;
		} else if (keyword == 'on') {
			responseOn = true;
			message = 'Auto-responder now turned on';
		} else if (keyword == 'off') {
			responseOn = false;
			message = 'Auto-responder now turned off';
		}

		debug(message);
	} else {
		// Only add non-admin users to the number store
		numberStore.saveNumber(req.body.from);
	}

	if (message) {
		debug('Trying to send reply...');

		request
			.post('https://api.clockworksms.com/http/send.aspx')
			.form({
				key: process.env.API_KEY,
				to: req.body.from,
				long: 1,
				content: message
			})
			.on('error', (err) => {
				// XXX Handle this better - give a 500 message?
				debug(err);
			})
			.on('response', () => {
				debug('Sent message to ' + req.body.from + '.')
				success(res);
			});
	} else {
		debug('Message from ' + req.body.from + ' ignored as responses turned off.')
		success(res);
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
