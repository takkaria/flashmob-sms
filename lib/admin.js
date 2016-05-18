'use strict';

const debug = require('debug')('flashmob-sms:admin');

const sendSMS = require('./send-sms');
const messageStore = require('./message-store');
const numberStore = require('./number-store');

function parseMessage(message, keyword) {
	if (!message) return;

	let parsed = {};
	let splat = message.split(' ');

	// If we have keyword, it means the message is of the form
	// 'keyword <command>'.  So we ignore the first token in the string
	// and instead jump ahead.
	if (keyword) {
		splat.shift();
	}

	if (message) {
		parsed.keyword = splat.shift();
		parsed.content = splat.join(' ');
	}

	return parsed;
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
	update: function(parsedMsg) {
		// XXX Warn about over-long messages
		messageStore.saveMessage(parsedMsg.content);
		distributeUpdate();

		return 'Message updated';
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

	let parsedMsg = parseMessage(req.body.content, req.body.keyword);
	if (!parsedMsg) {
		res.status(200).send('Unparsable message received');
		return;
	}

	let keyword = parsedMsg.keyword;
	if (keyword && typeof actions[keyword] === 'function') {
		let fn = actions[keyword];
		message.content = fn(parsedMsg);
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
