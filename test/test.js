'use strict';

const chai = require('chai');
const request = require('request');
const expect = chai.expect;
const nock = require('nock');

const appPort = 4000;
const appUrl = 'http://localhost:' + appPort + '/';
const app = require('../index');


function sendSMS(params) {
	return request.post({
		url: appUrl,
		form: params
	});
}


before(function(done) {
	process.env.PORT = appPort;
	app(done);
});

describe('an incoming message', function() {
	const phoneNumber = '4479677777222';

	afterEach(function() {
		nock.cleanAll();
	})

	describe('with no text content', function() {
		it('should reply to the sender', function(done) {
			let apiCall = nock('https://api.clockworksms.com')
				.post('/http/send.aspx', {
					to: phoneNumber
				})
				.reply(200, 'To ' + phoneNumber + ' AB_12345');

			sendSMS({
					from: phoneNumber
				})
				.on('error', done)
				.on('response', response => {
					expect(apiCall.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})
	})

	describe('starting with "update"', function() {
		const newMessage = 'Testing 1234';

		it('should reply with confirmation of change', function(done) {
			let confirmationSMS = nock('https://api.clockworksms.com')
				.post('/http/send.aspx', body => body.content.includes(newMessage))
				.reply(200, 'To ' + phoneNumber + ' AB_12345');

			sendSMS({
					from: phoneNumber,
					content: 'update ' + newMessage
				})
				.on('error', done)
				.on('response', response => {
					expect(response.statusCode).to.equal(200);
					expect(confirmationSMS.isDone()).to.equal(true);
					done();
				});
		})
	})

})


/*
request
	.post({
		url: '',
		form: {
			to: 'xxx',
			from: 'xxx',
			content: 'xxx',
			id: 'xxx',
			keyword: 'xxx'
		}
	})
	.on('error', done)
	.on('response', response => {
		expect(response.statusCode).to.equal(200);
	});
*/
