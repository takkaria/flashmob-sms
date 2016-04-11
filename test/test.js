'use strict';

const chai = require('chai');
const request = require('request');
const expect = chai.expect;
const nock = require('nock');

const appPort = 4000;
const appUrl = 'http://localhost:' + appPort + '/';
const app = require('../index');

before(function(done) {
	process.env.PORT = appPort;
	app(done);
});

describe('a request to /', function() {

	afterEach(function() {
		nock.cleanAll();
	})

	it('should send a message back to the sender', function(done) {
		const phoneNumber = '4479677777222';

		let apiCall = nock('https://api.clockworksms.com')
			.post('/http/send.aspx', {
				to: phoneNumber
			})
			.reply(200, 'To ' + phoneNumber + ' AB_12345');

		request
			.post({
				url: appUrl,
				form: {
					from: phoneNumber
				}
			})
			.on('error', done)
			.on('response', response => {
				expect(apiCall.isDone()).to.equal(true);
				expect(response.statusCode).to.equal(200);
				done();
			});
	});

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
