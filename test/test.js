'use strict';

const chai = require('chai');
const request = require('request');
const expect = chai.expect;
const nock = require('nock');


// ====== App init

const appPort = 4000;
const appUrl = 'http://localhost:' + appPort + '/';
const appApiKey = 'testing';

const normalNumber = '44NORMAL';
const adminNumber = '44ADMIN';

before(function(done) {
	process.env.PORT = appPort;
	process.env.API_KEY = appApiKey;
	process.env.ALLOWED_NUMBERS = adminNumber;

	const app = require('../index');
	app(done);
});


// ====== Test helpers

function sendSMS(params) {
	params = params || {};
	params.from = params.from || normalNumber;

	return request.post({
		url: appUrl,
		form: params
	});
}

function expectSMS(param) {
	param = param || {};
	param.key = appApiKey;

	let apiCall = nock('https://api.clockworksms.com')
		.post('/http/send.aspx', param)
		.reply(200, 'XXX Fill me out properly');

	return apiCall;
}


// ====== Testing bits

function turnOnResponses(it, before) {
	it('(assuming responses are turned on)')
	before(function(done) {
		sendSMS({ content: 'on', from: adminNumber })
			.on('error', done)
			.on('response', response => {
				expect(response.statusCode).to.equal(200);
				done();
			});
	})
}


// ====== Testing proper

describe('If I post to the endpoint', function() {
	it('(assuming RESTRICT_IP=1) I should receive an error', function(done) {
		process.env.RESTRICT_IP = 1;
		sendSMS()
			.on('error', done)
			.on('response', response => {
				expect(response.statusCode).to.equal(401);
				done();
			});
	})

	it('(assuming RESTRICT_IP=0) I should not receive an error', function(done) {
		process.env.RESTRICT_IP = 0;
		sendSMS()
			.on('error', done)
			.on('response', response => {
				expect(response.statusCode).to.equal(200);
				done();
			});
	})
})

describe('If I send an SMS', function() {
	afterEach(function() {
		nock.cleanAll();
	})

	describe('starting with "on" from an admin number', function() {

		it('I should receive confirmation of change', function(done) {
			let confirmationSMS = expectSMS({ content: /on/ });

			sendSMS({
				content: 'on',
				from: adminNumber
			})
				.on('error', done)
				.on('response', response => {
					expect(confirmationSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})

		// This test is identical to the one above except with a 'keyword' added
		it('(with shortcode) I should receive confirmation of change', function(done) {
			let confirmationSMS = expectSMS({ content: /on/ });

			sendSMS({
				keyword: 'keyword',
				content: 'keyword on',
				from: adminNumber
			})
				.on('error', done)
				.on('response', response => {
					expect(confirmationSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})

		it('sending another SMS (from non admin number) should get me a message', function(done) {
			let responseSMS = expectSMS();

			return sendSMS()
				.on('error', done)
				.on('response', response => {
					expect(responseSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})
	})

	describe('starting with "off" from an admin number', function() {
		it('I should receive confirmation of change', function(done) {
			let confirmationSMS = expectSMS({ content: /off/ });

			sendSMS({ content: 'off', from: adminNumber })
				.on('error', done)
				.on('response', response => {
					expect(confirmationSMS.isDone()).to.equal(true);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})

		it('sending another SMS (from non admin number) should get me no message', function(done) {
			let responseSMS = expectSMS();

			return sendSMS()
				.on('error', done)
				.on('response', response => {
					expect(responseSMS.isDone()).to.equal(false);
					expect(response.statusCode).to.equal(200);
					done();
				});
		})
	})

	describe('starting with "update"', function() {
		const newMessage = 'Testing 1234';

		turnOnResponses(it, before);

		describe('from a non admin number', function() {
			it('it should be treated as an empty text & I should receive a reply', function(done) {
				let responseSMS = expectSMS({ content: 'Testing' }); // XXX this is a magic constant

				sendSMS({ content: 'update ' + newMessage })
					.on('error', done)
					.on('response', response => {
						expect(responseSMS.isDone()).to.equal(true);
						expect(response.statusCode).to.equal(200);
						done();
					});
			})
		})

		describe('from an admin number', function() {
			it('I should receive confirmation of change', function(done) {
				let confirmationSMS = expectSMS({ content: /updated/ });

				sendSMS({ content: 'update ' + newMessage, from: adminNumber })
					.on('error', done)
					.on('response', response => {
						expect(confirmationSMS.isDone()).to.equal(true);
						expect(response.statusCode).to.equal(200);
						done();
					});
			})

			it('sending another SMS (from a non admin number) should get me the new message', function(done) {
				let responseSMS = expectSMS({ content: newMessage });

				return sendSMS()
					.on('error', done)
					.on('response', response => {
						expect(responseSMS.isDone()).to.equal(true);
						expect(response.statusCode).to.equal(200);
						done();
					});
			})
		})

	})

})
