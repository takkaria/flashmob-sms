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

		if (typeof parsed.keyword === 'string')
			parsed.keyword = parsed.keyword.toLowerCase();
	}

	return parsed;
}

function distributeUpdate(text) {
	let numbers = numberStore.getAll();
	if (numbers.length === 0) {
		debug("Message not distributed as number store is empty.");
		return;
	}

	const numNumbers = numbers.length;
	const portionSize = 50;
	let splitNumbers = [];
	let min = 0;

	while (1) {
		let max = Math.min(min + portionSize, numNumbers);
		let segment = numbers.slice(min, max);
		splitNumbers.push(segment);

		if (max < numNumbers) {
			min += portionSize;
		} else {
			break;
		}
	}

	for (let portion of splitNumbers) {
		let message = {
			to: portion.join(','),
			content: text
		};

		sendSMS(message, (err) => {
			if (err) {
				debug('Failed to distribute message update');
			} else {
				debug('Successfully distributed message update');
			}
		})
	}
}

function howManySMS(length) {
	if (length < 161) {
		return 1;
	} else if (length < 307) {
		return 2;
	} else if (length < 460) {
		return 3;
	} else {
		return NaN;
	}
}

const actions = {
	update: function(parsedMsg) {
		if (!parsedMsg.content) {
			return 'Error: message update contains no message';
		}

		// Save the message
		messageStore.saveMessage(parsedMsg.content);
		distributeUpdate(parsedMsg.content);

		// Notify the user
		let characters = parsedMsg.content.length;
		let sms = howManySMS(characters);

		return 'Message updated; ' + characters + ' characters, ' + sms + ' SMSes per message';
	},

	on: function() {
		messageStore.turnOn();
		return 'Auto-responder now turned on';
	},

	off: function() {
		messageStore.turnOff();
		return 'Auto-responder now turned off';
	},

	wipe: function() {
		messageStore.wipe();
		numberStore.wipe();
		return 'Message & numbers wiped, responses turned off';
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
