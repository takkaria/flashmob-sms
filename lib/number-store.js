'use strict';

let storedNumbers = [];

function saveNumber(num) {
	storedNumbers.push(num);
}

module.exports = {
	saveNumber: saveNumber
}
