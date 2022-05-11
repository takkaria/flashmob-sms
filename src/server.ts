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

function checkEnv() {
  const REQUIRED_ENVS = [
    "DATABASE_URL",
    "TWILIO_FROM",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
  ];
  for (const env of REQUIRED_ENVS) {
    if (!process.env[env]) {
      abort(`Need env var ${env}`);
    }
  }
}

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Enabled as we're deploying on Heroku
app.set("trust proxy", true);

// Add IP restrictor
app.use(ipCheck);

// ====== App code

async function userMessage(req: Request, res: Response) {
  if (messageStore.isOn()) {
    const recipient = req.body.from;
    numberStore.saveNumber(recipient);
    await sendSMS(recipient, messageStore.getMessage());
    res.status(200).send("Message replied to");
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

app.post("/", async function (req: Request, res: Response) {
  debug("Received message from " + req.body.from);
  debug("Message body: ", req.body.content);

  try {
    if (checkAccess(req.body.from)) {
      await adminMessage(req, res);
    } else {
      await userMessage(req, res);
    }
  } catch (err) {
    res.status(500).send(`Server error ${err}`);
    return;
  }
});

export async function server(port: number): Promise<void> {
  checkEnv();
  const instance = await initDb();
  setInstance(instance);
  const all = await Promise.all([
    numberStore.restore,
    messageStore.restoreStatus,
    messageStore.restoreMessage,
  ]);

  return new Promise((resolve, reject) => {
    app.listen(port, () => resolve());
  });
}

if (require.main === module) {
  const port = parseInt(process.env["PORT"] ?? "", 10) || 3000;
  server(port).then(() => console.log("Listening on port " + port));
}
