'use strict';

const chai = require('chai');
const request = require('request');
const expect = chai.expect;
const nock = require('nock');


// ====== App init

const appPort = 4000;
const appUrl = 'http://localhost:' + appPort + '/';

before(function(done) {
	process.env.PORT = appPort;
	const app = require('../index');
	app(done);
});


// ====== Test helpers

const phoneNumber = '4479677777222';

function sendSMS(params) {
	return request.post({
		url: appUrl,
		form: params
	});
}

function apiExpect(param) {
	let apiCall = nock('https://api.clockworksms.com')
		.post('/http/send.aspx', param)
		.reply(200, 'To ' + phoneNumber + ' AB_12345');

	return apiCall;
}


// ====== Testing proper

describe('If I send an SMS', function() {
	afterEach(function() {
		nock.cleanAll();
	})

	describe('with no text content', function() {
		it('I should receive a reply', function(done) {
			let responseSMS = apiExpect({ to: phoneNumber });

			sendSMS({
					from: phoneNumber
				})
				.on('error', done)
				.on('response', response => {
					expect(responseSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})
	})

	describe('starting with "update"', function() {
		const newMessage = 'Testing 1234';

		it('I should receive confirmation of change', function(done) {
			let confirmationSMS = apiExpect(body => body.content.includes(newMessage));

			sendSMS({
					from: phoneNumber,
					content: 'update ' + newMessage
				})
				.on('error', done)
				.on('response', response => {
					expect(confirmationSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})

		it('sending another SMS should get me the new message', function(done) {
			let confirmationSMS = apiExpect({ content: newMessage });

			sendSMS({
					from: phoneNumber
				})
				.on('error', done)
				.on('response', response => {
					expect(confirmationSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})
	})
})
