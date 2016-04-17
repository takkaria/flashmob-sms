'use strict';

const express = require('express');
const bodyParser = require('body-parser')
const request = require('request');

// ====== Initialisation

const app = express();
app.use(bodyParser.urlencoded({ extended: false }))

if (!process.env.ALLOWED_NUMBERS)
	process.env.ALLOWED_NUMBERS = '';


// ====== App code

let responseText = 'Testing';
let responseOn = false;

function getKeyword(str) {
	if (str) {
		let arr = str.split(' ');
		return arr[0];
	}
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

	let message;
	if (responseOn)
		message = responseText;

	if (checkAccess(req.body.from)) {
		let incomingMsg = req.body.content;
		let keyword = getKeyword(incomingMsg);

		if (keyword == 'update') {
			// Extract from after the space after 'update'
			responseText = incomingMsg.substr(7);
			message = 'Messaage updated to: ' + responseText;
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
				to: req.body.from,
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
