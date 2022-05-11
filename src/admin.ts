import Debug from "debug";
const debug = Debug("flashmob-sms:admin");

import type { Request, Response } from "express";

import { sendSMS, sendBulkSMS } from "./send-sms";
import messageStore from "./message-store";
import numberStore from "./number-store";
import { z } from "zod";

type ParsedMessage = {
  keyword: string;
  content: string;
};

function parseMessage(message: string): ParsedMessage | null {
  if (message === "") {
    return null;
  }

  let splat = message.split(" ");
  return {
    keyword: splat.shift()?.toLowerCase() ?? "",
    content: splat.join(" "),
  };
}

function howManySMS(length: number) {
  if (length < 161) {
    return 1;
  } else if (length < 307) {
    return 2;
  } else if (length < 460) {
    return 3;
  } else {
    return NaN;
  }
}

type Action = (message: ParsedMessage) => Promise<string>;
type ActionTable = {
  [k: string]: Action;
};

const actions: ActionTable = {
  update: async function (message: ParsedMessage) {
    if (!message.content) {
      return "Error: message update contains no message";
    }

    // Save the message
    messageStore.saveMessage(message.content);
    let numbers = numberStore.getAll();
    await sendBulkSMS(numbers, message.content);

    // Notify the user
    let characters = message.content.length;
    let sms = howManySMS(characters);

    return `Message updated; ${characters} characters, ${sms} SMSes per message`;
  },

  on: async function () {
    messageStore.turnOn();
    return "Auto-responder now turned on";
  },

  off: async function () {
    messageStore.turnOff();
    return "Auto-responder now turned off";
  },

  wipe: async function () {
    messageStore.wipe();
    numberStore.wipe();
    return "Message & numbers wiped, responses turned off";
  },

  status: async function () {
    let recipients = numberStore.getAll().length;
    let on = messageStore.isOn() ? "on" : "off";
    return `Auto-responder is ${on}. ${recipients} currently registered phone numbers.`;
  },
};

export async function adminMessage(
  input: { From: string; Body: string },
  res: Response
): Promise<void> {
  const parsedMsg = parseMessage(input.Body);
  if (!parsedMsg) {
    res.status(200).send("<Response></Response>");
    return;
  }

  const keyword = parsedMsg.keyword;
  const action = actions?.[keyword];

  await sendSMS(
    input.From,
    action ? await action(parsedMsg) : "Command not recognised"
  );
  res.status(200).send("<Response></Response>");
}
