'use strict';

const pg = require('pg');
const massive = require('massive');

pg.defaults.ssl = true;
let massiveInstance = massive.connectSync({
	connectionString: process.env.DATABASE_URL,
	ssl: true
});

module.exports = massiveInstance;
