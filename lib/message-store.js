'use strict';

let storedMessage = 'Testing';
let messageOn = false;

function saveMessage(str) {
	storedMessage = str;
}

function getMessage(str) {
	return storedMessage;
}

function isOn() {
	return messageOn;
}

function turnOn() {
	messageOn = true;
}

function turnOff() {
	messageOn = false;
}

module.exports = {
	saveMessage: saveMessage,
	getMessage: getMessage,
	isOn: isOn,
	turnOff: turnOff,
	turnOn: turnOn
}
