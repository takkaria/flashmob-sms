'use strict';

const db = require('./db');
const debug = require('debug')('flashmob-sms:message-store')

let storedMessage = 'Testing';
let messageOn = false;

function dbState(status) {
	db.status.save({ id: 1, state: status }, (err, res) => {
		if (err) {
			debug("DB: Failed database syncing auto-responder state");
		}
	});
}

module.exports = {
	saveMessage: function saveMessage(str) {
		storedMessage = str;
		db.messages.insert({ message: str }, (err, res) => {
			if (err) {
				debug("DB: error inserting message", err);
			} else {
				debug("DB: insert succeeded");
			}
		})
	},

	getMessage: function getMessage(str) {
		return storedMessage;
	},

	turnOff: function turnOff() {
		messageOn = false;
		dbState(false);
	},

	turnOn: function turnOn() {
		messageOn = true;
		dbState(true);
	},

	isOn: function isOn() {
		return messageOn;
	},

	restore: function restore() {
		db.currentStatus((err, res) => {
			if (err) {
				debug("DB: error restoring status", err);
				return;
			}

			if (res && res[0]) {
				messageOn = res[0].state;
			}
		});

		db.currentMessage((err, res) => {
			if (err) {
				debug("DB: error restoring message", err);
				return;
			}

			if (res && res[0]) {
				storedMessage = res[0].message;
			}
		})
	},

	wipe: function wipe() {
		messageOn = false;
		dbState(false);

		storedMessage = '';
		db.messages.destroy({}, (err, res) => {
			if (err) {
				debug("DB: Error deleting messages", err);
			}
		})
	}
}
