import { instance } from "./db";
import Debug from "debug";
const debug = Debug("flashmob-sms:message-store");
import type { Request, Response } from "express";

let storedMessage = "";
let messageOn = false;

function dbState(state: boolean) {
  try {
    instance['status'].save({ id: 1, state });
  } catch (err) {
    debug("DB: Failed database syncing auto-responder state");
  }
}

const messageStore = {
  saveMessage: function saveMessage(message: string) {
    storedMessage = message;
    try {
      instance['messages'].insert({ message });
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
    debug("Restoring status...");

    let result;
    try {
      result = await instance['currentStatus']();
    } catch (err) {
      debug("DB: error restoring status", err);
    }

    if (result && result[0]) {
      messageOn = result[0].state;
      debug("Status restored: ", messageOn);
    }
  },

  async restoreMessage(): Promise<void> {
    debug("Restoring message...");

    let result;
    try {
      result = await instance['currentMessage']();
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
      instance['messages'].destroy({});
    } catch (err) {
      debug("DB: Error deleting messages", err);
    }
  },
};

export default messageStore;
