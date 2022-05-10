"use strict";

const db = require("./db");
const debug = require("debug")("flashmob-sms:number-store");

let storedNumbers = [];

function dbSync() {
  let row = { data: JSON.stringify(storedNumbers) };

  db.instance.numbers.insert(row, (err, res) => {
    if (err) {
      debug("DB: error updating phone numbers", err);
    } else {
      debug("DB: insert succeeded");
    }
  });

  timeoutID = null;
}

let timeoutID;
function scheduleDbUpdate() {
  if (!timeoutID) {
    timeoutID = setTimeout(dbSync, 200);
  }
}

module.exports = {
  saveNumber: function saveNumber(num) {
    if (storedNumbers.findIndex((elem) => elem == num) !== -1) {
      return;
    }

    storedNumbers.push(num);
    scheduleDbUpdate();
  },

  getAll: function getAll() {
    return storedNumbers;
  },

  restore: function restoreNumbers(cb) {
    db.instance.currentNumbers((err, res) => {
      if (err) {
        debug("DB: error restoring numbers", err);
      } else if (res && res[0]) {
        storedNumbers = JSON.parse(res[0].data);
        debug("Numbers restored: ", storedNumbers);
      }

      if (cb) {
        cb(err);
      }
    });
  },

  wipe: function wipe() {
    storedNumbers = [];

    db.instance.numbers.destroy({}, (err, res) => {
      if (err) {
        debug("DB: Error deleting phone numbers", err);
      }
    });
  },
};
