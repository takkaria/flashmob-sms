'use strict';

const request = require('request');
const debug = require('debug')('flashmob-sms:send-sms');

module.exports = function sendSMS(param, cb) {
	debug('Trying to send message...');

	param.key = process.env.API_KEY;
	param.long = 1;

	request
		.post('https://api.clockworksms.com/http/send.aspx')
		.form(param)
		.on('error', (err) => {
			debug(err);
			cb(err);
		})
		.on('response', () => {
			debug('Sent message to ' + param.to + '.')
			cb();
		});
}
