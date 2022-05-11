import express from "express";
import type { Request, Response } from "express";
import bodyParser from "body-parser";
import { z } from "zod";

import { setInstance, init as initDb } from "./db";
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

// ====== App code

async function userMessage(
  input: { From: string; Body: string },
  res: Response
) {
  if (messageStore.isOn()) {
    const recipient = input.From;
    numberStore.saveNumber(recipient);
    await sendSMS(recipient, messageStore.getMessage());
    res.status(200).send("<Response></Response>");
  } else {
    debug(`Message from ${input.From} ignored as responses turned off.`);
    res.status(200).send("<Response></Response>");
  }
}

function checkAccess(from: string): boolean {
  return process.env["ALLOWED_NUMBERS"]?.includes(from) ?? false;
}

app.get("/", function (req: Request, res: Response) {
  res.status(200).send("Service up");
});

const bodySchema = z.object({
  From: z.string(),
  Body: z.string(),
});

app.post("/sms", async function (req: Request, res: Response) {
  const input = bodySchema.parse(req.body);

  debug("Received message from " + input.From);
  debug("Message body: ", input.Body);

  try {
    if (checkAccess(input.From)) {
      await adminMessage(input, res);
    } else {
      await userMessage(input, res);
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
