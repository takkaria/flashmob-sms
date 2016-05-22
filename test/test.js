'use strict';

const chai = require('chai');
const request = require('request');
const expect = chai.expect;
const nock = require('nock');

nock.disableNetConnect();
nock.enableNetConnect('localhost');

// ====== App init

const appPort = 4000;
const appUrl = 'http://localhost:' + appPort + '/';
const appApiKey = 'testing';

const normalNumber = '44NORMAL';
const adminNumber = '44ADMIN';

before(function(done) {
	this.timeout(5000);

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

describe('Testing admin commands.  Assume all following sent from admin number', function() {
	afterEach(function() {
		nock.cleanAll();
	})

	describe('If I send "wipe"', function() {
		it('I should be told all data is wiped', function() {
			return sendSMS({
				from: adminNumber,
				content: 'wipe',
				response: expectSMS({ content: /wiped/ })
			})
		})

		it('& then if I turn on the responder', function() {
			return sendSMS({
				from: adminNumber,
				content: 'on'
			});
		})

		it('& make an update, no message should be sent out', function() {
			return sendSMS({
				from: adminNumber,
				content: 'update Testy McTesterson',
				response: expectSMS({ to: adminNumber, content: /update/ }),
				noResponse: expectSMS()
			})
		})
	})

	describe('If I send an empty message', function() {
		it('I should not receive a response', function() {
			return sendSMS({
				from: adminNumber,
				noResponse: expectSMS()
			})
		})
	})

	describe('If I send "ON"', function() {
		it('I should receive confirmation of change', function() {
			return sendSMS({
				from: adminNumber,
				content: 'ON',
				response: expectSMS({ content: /on/ })
			})
		})
	})

	describe('If I send "on"', function() {
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

	describe('If I send "off"', function() {
		it('I should receive confirmation of change', function() {
			return sendSMS({
				from: adminNumber,
				content: 'off',
				response: expectSMS({ content: /off/ })
			})
		})

		it('sending another SMS (from non admin number) should get me no message', function() {
			return sendSMS({
				noResponse: expectSMS()
			})
		})
	})

	describe('If I send "update" (from a non admin number)', function() {
		turnOnResponses(it, before);

		it('it should be treated as an empty text & I should receive a reply', function() {
			return sendSMS({
				content: 'update blah',
				response: expectSMS(body => !body.content.includes('blah'))
			})
		})
	})

	describe('If I send "update Testing 1234" (no keyword)', function() {
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

	describe('If I send "update 1234" (with keyword)', function() {
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

	describe('If I send "update" (and nothing else) from an admin number (no keyword)', function() {
		it('I should receive an error', function() {
			return sendSMS({
				from: adminNumber,
				content: 'update',
				response: expectSMS({ content: /error/i })
			})
		})
	})

	describe('If I send "update <180 characters>" from an admin number', function() {
		it('I should be told it will use 2 SMSes when distributed', function() {
			let long = 'x'.repeat(180);
			return sendSMS({
				from: adminNumber,
				content: 'update ' + long,
				response: expectSMS({ content: /2/i })
			})
		})
	})
})

describe('Testing update distribution', function() {
	afterEach(function() {
		nock.cleanAll();
	})
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

	describe('Testing 150 users', function() {
		let allNumbers = [];
		for (let i = 0; i < 149; i++) {
			allNumbers.push('0790' + (1000000 + i))
		}

		it('(registering 149 numbers; 1 - normalNumber - is already registered)');

		// Mock up 149 API calls
		before(function() {
			nock('https://api.clockworksms.com')
				.post('/http/send.aspx')
				.times(149)
//				.delay(30) // - only when testing DB access
				.reply(200, 'OK');
		});

		for (let number of allNumbers) {
			before(() => sendSMS({ from: number }));
		}

		it('if I update the message text, only 3 API calls should be made (50 recipients each)', function() {
			return sendSMS({
				from: adminNumber,
				content: 'update Come to Piccadilly Gardens NOW',
				response: [ expectSMS({ to: adminNumber }), expectSMS(), expectSMS(), expectSMS() ],
				noResponse: expectSMS()
			})
		})

		it('if I ask for a status update, 150 recipients should be mentioned', function() {
			return sendSMS({
				from: adminNumber,
				content: 'status',
				response: expectSMS({ content: /150/ })
			})
		})
	})
})
