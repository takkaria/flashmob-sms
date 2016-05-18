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
	// Turn params.response into an array
	if (params.response && params.response.length === undefined) {
		params.response = [ params.response ];
	}

	// Set up an SMS expectation so we can check it ISN'T fulfilled
	if (params.noResponse) {
		params.noResponse = expectSMS();
	}

	return new Promise((fulfill, reject) => {
		request
			.post({
				url: appUrl,
				form: {
					from: params.from || normalNumber,
					content: params.content,
					keyword: params.keyword
				}
			})
			.on('error', reject)
			.on('response', response => {
				expect(response.statusCode).to.equal(params.statusCode || 200);

				if (params.response) {
					for (response of params.response) {
						expect(response.isDone()).to.equal(true);
					}
				}

				if (params.noResponse) {
					expect(params.noResponse.isDone()).to.equal(false);
				}

				fulfill();
			});
	})
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
	before(function() {
		return sendSMS({
			from: adminNumber,
			content: 'on'
		});
	})
}


// ====== Testing proper

describe('If I post to the endpoint', function() {
	it('(assuming RESTRICT_IP=1) I should receive an error', function() {
		process.env.RESTRICT_IP = 1;
		return sendSMS({
			statusCode: 401
		});
	})

	it('(assuming RESTRICT_IP=0) I should not receive an error', function() {
		process.env.RESTRICT_IP = 0;
		return sendSMS({
			statusCode: 200
		});
	})
})

describe('Testing commands.  If I send an SMS', function() {
	afterEach(function() {
		nock.cleanAll();
	})

	describe('starting with "on" from an admin number', function() {
		it('I should receive confirmation of change', function() {
			return sendSMS({
				from: adminNumber,
				content: 'on',
				response: expectSMS({ content: /on/ })
			})
		})

		// This test is identical to the one above except with a 'keyword' added
		it('(with keyword) I should receive confirmation of change', function() {
			return sendSMS({
				from: adminNumber,
				keyword: 'keyword',
				content: 'keyword on',
				response: expectSMS({ content: /on/ })
			})
		})

		it('sending another SMS (from non admin number) should get me a message', function() {
			return sendSMS({
				response: expectSMS()
			})
		})
	})

	describe('starting with "off" from an admin number', function() {
		it('I should receive confirmation of change', function() {
			return sendSMS({
				from: adminNumber,
				content: 'off',
				response: expectSMS({ content: /off/ })
			})
		})

		it('sending another SMS (from non admin number) should get me no message', function() {
			return sendSMS({
				noResponse: true
			})
		})
	})

	describe('starting with "update" from a non admin number', function() {
		turnOnResponses(it, before);

		it('it should be treated as an empty text & I should receive a reply', function() {
			return sendSMS({
				content: 'update blah',
				response: expectSMS(body => !body.content.includes('blah'))
			})
		})
	})

	describe('starting with "update" from an admin number (no keyword)', function() {
		const newMessage = 'Testing 1234';

		it('I should receive confirmation of change', function() {
			return sendSMS({
				from: adminNumber,
				content: 'update ' + newMessage,
				response: expectSMS({ content: /updated/ })
			})
		})

		it('sending another SMS (from a non admin number) should get me the new message', function() {
			return sendSMS({
				response: expectSMS({ content: newMessage })
			})
		})
	})

	describe('starting with "update" from an admin number (with keyword)', function() {
		turnOnResponses(it, before);

		it('I should receive confirmation of change without "update" in the message', function() {
			return sendSMS({
				from: adminNumber,
				keyword: 'keyword',
				content: 'keyword update 1234',
				response: expectSMS(body => !body.content.includes('update 1234'))
			})
		})
	})
})

describe('Testing update distribution', function() {
	turnOnResponses(it, before);

	it('if I send an empty SMS from a non admin number', function() {
		return sendSMS({
			from: normalNumber,
			response: expectSMS()
		})
	})

	it('and then update the message text, the update should be sent to the non admin number', function() {
		return sendSMS({
			from: adminNumber,
			content: 'update amazingtime',
			response: [
				expectSMS({ to: adminNumber }),
				expectSMS({ content: /amazingtime/, to: normalNumber })
			]
		})
	})
})
