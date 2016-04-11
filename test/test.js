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

	it('should trigger a request to send a message', function(done) {
		let apiCall = nock('https://api.clockworksms.com')
			.post('/http/send.aspx')
			.reply(200, 'OK');

		request
			.post({
				url: appUrl
			})
			.on('error', done)
			.on('response', response => {
				expect(apiCall.isDone()).to.equal(true);
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
