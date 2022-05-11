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

function parseMessage(
  message: string,
  keyword: string | null
): ParsedMessage | null {
  if (message === "") {
    return null;
  }

  let splat = message.split(" ");

  // If we have keyword, it means the message is of the form
  // 'keyword <command>'.  So we ignore the first token in the string
  // and instead jump ahead.
  if (keyword) {
    splat.shift();
  }

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

const bodySchema = z.object({
  from: z.string(),
  keyword: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  content: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
});

export async function adminMessage(req: Request, res: Response): Promise<void> {
  const input = bodySchema.parse(req.body);

  const parsedMsg = parseMessage(input.content, input.keyword);
  if (!parsedMsg) {
    res.status(200).send("Unparsable message received");
    return;
  }

  const keyword = parsedMsg.keyword;
  const action = actions?.[keyword];

  await sendSMS(
    input.from,
    action ? await action(parsedMsg) : "Command not recognised"
  );
  res.status(200).send("Admin message received & replied to");
}
