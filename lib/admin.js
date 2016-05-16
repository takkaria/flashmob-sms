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

function distributeUpdate() {
	let message = {
		to: numberStore.getAll().join(','),
		content: messageStore.getMessage()
	};

	sendSMS(message, (err) => {
		if (err) {
			debug('Failed to distribute message update');
		} else {
			debug('Successfully distributed message update');
		}
	})
}

const actions = {
	update: function(incomingMsg) {
		// Extract from after the space after 'update'
		// XXX This won't work when using a shortcode
		// XXX Warn about over-long messages
		let newMsg = incomingMsg.substr(7);

		messageStore.saveMessage(newMsg);
		distributeUpdate();

		return 'Message updated to: ' + newMsg;
	},

	on: function() {
		messageStore.turnOn();
		return 'Auto-responder now turned on';
	},

	off: function() {
		messageStore.turnOff();
		return 'Auto-responder now turned off';
	}
}

function adminMessage(req, res) {
	let message = {
		to: req.body.from
	};

	let incomingMsg = req.body.content;
	let keyword = getKeyword(incomingMsg, req.body.keyword);

	if (typeof actions[keyword] === 'function') {
		let fn = actions[keyword];
		message.content = fn(incomingMsg);
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
