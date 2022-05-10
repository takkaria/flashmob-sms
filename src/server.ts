import express from "express";
import type { Request, Response } from "express";
import bodyParser from "body-parser";
import { setInstance, init as initDb } from "./db";
import ipCheck from "./ip-check";
import numberStore from "./number-store";
import messageStore from "./message-store";
import { sendSMS } from "./send-sms";
import { adminMessage } from "./admin";

import Debug from "debug";
const debug = Debug("flashmob-sms:server");

// ====== Initialisation

function abort(text: string) {
  console.log("ERROR: ", text);
  process.exit(1);
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

if (!process.env["ALLOWED_NUMBERS"]) process.env["ALLOWED_NUMBERS"] = "";
if (!process.env["API_KEY"]) abort("No API key specified - aborting");

// Enabled as we're deploying on Heroku
app.set("trust proxy", true);

// Add IP restrictor
app.use(ipCheck);

// ====== App code

function userMessage(req: Request, res: Response) {
  if (messageStore.isOn()) {
    let message = {
      to: req.body.from,
      content: messageStore.getMessage(),
    };

    numberStore.saveNumber(req.body.from);

    sendSMS(message).then(() => res.status(200).send("Message replied to"));
  } else {
    debug(`Message from ${req.body.from} ignored as responses turned off.`);
    res.status(200).send("Message ignored");
  }
}

function checkAccess(from: string): boolean {
  return process.env["ALLOWED_NUMBERS"]?.includes(from) ?? false;
}

app.get("/", function (req: Request, res: Response) {
  res.status(200).send("Service up");
});

app.post("/", function (req: Request, res: Response) {
  debug("Received message from " + req.body.from);
  debug("Message body: ", req.body.content);

  if (checkAccess(req.body.from)) {
    adminMessage(req, res);
  } else {
    userMessage(req, res);
  }
});

// ====== Either run (if run directly) or export as a module

async function start() {
  const port = parseInt(process.env["PORT"] ?? "", 10) || 3000;
  const instance = await initDb();
  setInstance(instance);
  const all = await Promise.all([
    numberStore.restore,
    messageStore.restoreStatus,
    messageStore.restoreMessage,
  ]);

  return new Promise((resolve, reject) => {
    app.listen(port, () => resolve(null));
  });
}

if (require.main === module) {
  start().then((port) => console.log("Listening on port " + port));
}

module.exports = start;
