'use strict';

const db = require('./db');
const debug = require('debug')('flashmob-sms:number-store')

if (!Array.prototype.includes) {
	Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
		'use strict';
		var O = Object(this);
		var len = parseInt(O.length) || 0;
		if (len === 0) {
			return false;
		}
		var n = parseInt(arguments[1]) || 0;
		var k;
		if (n >= 0) {
			k = n;
		} else {
			k = len + n;
			if (k < 0) {k = 0;}
		}
		var currentElement;
		while (k < len) {
			currentElement = O[k];
			if (searchElement === currentElement ||
				 (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
				return true;
			}
			k++;
		}
		return false;
	};
}

let storedNumbers = [];

function dbSync() {
	let row = { data: JSON.stringify(storedNumbers) };

	db.numbers.insert(row, (err, res) => {
		if (err) {
			debug("DB: error updating phone numbers", err);
		} else {
			debug("DB: insert succeeded");
		}
	})

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
		if (storedNumbers.includes(num)) {
			return;
		}

		storedNumbers.push(num);
		scheduleDbUpdate();
	},

	getAll: function getAll() {
		return storedNumbers;
	},

	restore: function restore() {
		db.currentNumbers((err, res) => {
			if (err) {
				debug("DB: error restoring numbers", err);
				return;
			}

			if (res && res[0]) {
				storedNumbers = JSON.parse(res[0].data)
			}
		});
	},

	wipe: function wipe() {
		storedNumbers = [];

		db.numbers.destroy({}, (err, res) => {
			if (err) {
				debug("DB: Error deleting phone numbers", err);
			}
		})
	}
}
