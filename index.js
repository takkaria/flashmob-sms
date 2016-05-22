'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const debug = require('debug')('flashmob-sms');

const db = require('./lib/db'); // We include this here so DB init is done early

const ipCheck = require('./lib/ip-check');
const numberStore = require('./lib/number-store');
const messageStore = require('./lib/message-store');
const sendSMS = require('./lib/send-sms');
const admin = require('./lib/admin');

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

function userMessage(req, res) {
	if (messageStore.isOn()) {
		let message = {
			to: req.body.from,
			content: messageStore.getMessage()
		};

		numberStore.saveNumber(req.body.from);

		sendSMS(message, (err) => {
			// XXX Handle error here
			res.status(200).send('Message replied to');
		})
	} else {
		debug('Message from ' + req.body.from + ' ignored as responses turned off.')
		res.status(200).send('Message ignored');
	}
}

function checkAccess(from) {
	return process.env.ALLOWED_NUMBERS.includes(from);
}

app.post('/', function (req, res) {
	debug('Received message from ' + req.body.from);
	debug('Message body: ', req.body.content);

	if (checkAccess(req.body.from)) {
		admin(req, res);
	} else {
		userMessage(req, res);
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
