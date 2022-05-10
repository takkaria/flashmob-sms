"use strict";

const pg = require("pg");
const massive = require("massive");

let output;

output = {
  instance: null,
  setInstance: (inst) => (output.instance = inst),
  init: async () => {
    const params = { connectionString: process.env.DATABASE_URL };
    if ("DATABASE_SSL" in process.env) {
      params.ssl = { rejectUnauthorized: false };
    }
    return massive(params);
  },
};

module.exports = output;
