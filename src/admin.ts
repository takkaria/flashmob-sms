import Debug from "debug";
const debug = Debug("flashmob-sms:admin");

import type { Request, Response } from "express";

import sendSMS from "./send-sms";
import messageStore from "./message-store";
import numberStore from "./number-store";

type ParsedMessage = {
  keyword: string;
  content: string;
};

function parseMessage(
  message: string,
  keyword: string | null
): ParsedMessage | null {
  if (!message) return null;

  let splat = message.split(" ");

  // If we have keyword, it means the message is of the form
  // 'keyword <command>'.  So we ignore the first token in the string
  // and instead jump ahead.
  if (keyword) {
    splat.shift();
  }

  if (!message) {
    return null;
  }

  const parsed: ParsedMessage = {
    keyword: splat.shift()?.toLowerCase() ?? "",
    content: splat.join(" "),
  };

  return parsed;
}

function distributeUpdate(text: string) {
  let numbers = numberStore.getAll();
  if (numbers.length === 0) {
    debug("Message not distributed as number store is empty.");
    return;
  }

  const numNumbers = numbers.length;
  const portionSize = 50;
  let splitNumbers: string[][] = [];
  let min = 0;

  while (1) {
    let max = Math.min(min + portionSize, numNumbers);
    let segment = numbers.slice(min, max);
    splitNumbers.push(segment);

    if (max < numNumbers) {
      min += portionSize;
    } else {
      break;
    }
  }

  for (let portion of splitNumbers) {
    let message = {
      to: portion.join(","),
      content: text,
    };

    sendSMS(message, (err: Error) => {
      if (err) {
        debug("Failed to distribute message update");
      } else {
        debug("Successfully distributed message update");
      }
    });
  }
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

type Action = (message: ParsedMessage) => string;
type ActionTable = {
  [k: string]: Action;
};

const actions: ActionTable = {
  update: function (message: ParsedMessage) {
    if (!message.content) {
      return "Error: message update contains no message";
    }

    // Save the message
    messageStore.saveMessage(message.content);
    distributeUpdate(message.content);

    // Notify the user
    let characters = message.content.length;
    let sms = howManySMS(characters);

    return (
      "Message updated; " +
      characters +
      " characters, " +
      sms +
      " SMSes per message"
    );
  },

  on: function () {
    messageStore.turnOn();
    return "Auto-responder now turned on";
  },

  off: function () {
    messageStore.turnOff();
    return "Auto-responder now turned off";
  },

  wipe: function () {
    messageStore.wipe();
    numberStore.wipe();
    return "Message & numbers wiped, responses turned off";
  },

  status: function () {
    let recipients = numberStore.getAll().length;
    let on = messageStore.isOn() ? "on" : "off";
    return (
      "Auto-responder is " +
      on +
      ". " +
      recipients +
      " currently registered phone numbers."
    );
  },
};

export function adminMessage(req: Request, res: Response): void {
  let parsedMsg = parseMessage(req.body.content, req.body.keyword);
  if (!parsedMsg) {
    res.status(200).send("Unparsable message received");
    return;
  }

  let keyword = parsedMsg.keyword;
  let action = actions?.[keyword];

  sendSMS(
    {
      to: req.body.from,
      content: action ? action(parsedMsg) : "Command not recognised",
    },
    (err: Error) => {
      // XXX Handle error here
      res.status(200).send("Admin message received & replied to");
    }
  );
}
