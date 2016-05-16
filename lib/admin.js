'use strict';

const debug = require('debug')('flashmob-sms:admin');

const sendSMS = require('./send-sms');
const messageStore = require('./message-store');
const numberStore = require('./number-store');

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

function adminMessage(req, res) {
	let message = {
		to: req.body.from
	}

	let incomingMsg = req.body.content;
	let keyword = getKeyword(incomingMsg, req.body.keyword);

	debug('Checking keyword');

	if (keyword == 'update') {
		// Extract from after the space after 'update'
		// XXX This won't work when using a shortcode
		let newMsg = incomingMsg.substr(7);
		messageStore.saveMessage(newMsg);
		message.content = 'Message updated to: ' + newMsg;
	} else if (keyword == 'on') {
		messageStore.turnOn();
		message.content = 'Auto-responder now turned on';
	} else if (keyword == 'off') {
		messageStore.turnOff();
		message.content = 'Auto-responder now turned off';
	}

	if (message.content) {
		debug(message.content);
		sendSMS(message, (err) => {
			// XXX Handle error here
			res.status(200).send('Admin message received & replied to');
		})
	}
}

module.exports = function admin(req, res) {
	adminMessage(req, res);
}
