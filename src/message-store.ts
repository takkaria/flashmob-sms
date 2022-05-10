const db = require("./db");
import Debug from "debug";
const debug = Debug("flashmob-sms:message-store");
import type { Request, Response } from "express";

let storedMessage = "Testing";
let messageOn = false;

function dbState(state: boolean) {
  try {
    db.instance.status.save({ id: 1, state });
  } catch (err) {
    debug("DB: Failed database syncing auto-responder state");
  }
}

const messageStore = {
  saveMessage: function saveMessage(message: string) {
    storedMessage = message;
    try {
      db.instance.messages.insert({ message });
    } catch (err) {
      debug("DB: error inserting message", err);
      return;
    }

    debug("DB: insert succeeded");
  },

  getMessage: function getMessage() {
    return storedMessage;
  },

  turnOff: function turnOff() {
    messageOn = false;
    dbState(false);
  },

  turnOn: function turnOn() {
    messageOn = true;
    dbState(true);
  },

  isOn: function isOn() {
    return messageOn;
  },

  async restoreStatus(): Promise<void> {
    let result;
    try {
      result = db.instance.currentStatus();
    } catch (err) {
      debug("DB: error restoring status", err);
    }

    if (result && result[0]) {
      messageOn = result[0].state;
      debug("Status restored: ", messageOn);
    }
  },

  async restoreMessage(): Promise<void> {
    let result;
    try {
      result = db.instance.currentMessage();
    } catch (err) {
      debug("DB: error restoring message", err);
    }

    if (result && result[0]) {
      storedMessage = result[0].message;
      debug("Message restored: ", storedMessage);
    }
  },

  wipe: function wipe() {
    messageOn = false;
    dbState(false);

    storedMessage = "";
    try {
      db.instance.messages.destroy({});
    } catch (err) {
      debug("DB: Error deleting messages", err);
    }
  },
};

export default messageStore;
