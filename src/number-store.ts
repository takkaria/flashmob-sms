const db = require("./db");
import Debug from "debug";
const debug = Debug("flashmob-sms:number-store");

let storedNumbers: string[] = [];

function dbSync() {
  let row = { data: JSON.stringify(storedNumbers) };

  db.instance.numbers.insert(row, (err: Error) => {
    if (err) {
      debug("DB: error updating phone numbers", err);
    } else {
      debug("DB: insert succeeded");
    }
  });

  timeoutID = null;
}

let timeoutID: NodeJS.Timeout | null;
function scheduleDbUpdate() {
  if (!timeoutID) {
    timeoutID = setTimeout(dbSync, 200);
  }
}

const fns = {
  saveNumber: function saveNumber(num: string) {
    if (storedNumbers.findIndex((elem) => elem == num) !== -1) {
      return;
    }

    storedNumbers.push(num);
    scheduleDbUpdate();
  },

  getAll: function getAll() {
    return storedNumbers;
  },

  async restore(): Promise<void> {
    let result;
    try {
      result = await db.instance.currentNumbers();
    } catch (err) {
      debug("DB: error restoring numbers", err);
      return;
    }

    if (result && result[0]) {
      storedNumbers = JSON.parse(result[0].data);
      debug("Numbers restored: ", storedNumbers);
    }
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

export default fns;
