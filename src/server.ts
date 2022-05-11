import express from "express";
import type { Request, Response } from "express";
import bodyParser from "body-parser";
import { z } from "zod";
import twilio from "twilio";
const VoiceResponse = require("twilio").twiml.VoiceResponse;

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

function isAdmin(from: string): boolean {
  return process.env["ALLOWED_NUMBERS"]?.includes(from) ?? false;
}

app.get("/", function (req: Request, res: Response) {
  res.status(200).send("Service up");
});

const shouldValidate = process.env["ENV"] === "production";

const bodySchema = z.object({
  From: z.string(),
  Body: z.string(),
});

app.post(
  "/sms",
  twilio.webhook({ validate: shouldValidate }),
  async function (req: Request, res: Response) {
    const input = bodySchema.parse(req.body);

    debug("Received message from " + input.From);
    debug("Message body: ", input.Body);

    try {
      if (isAdmin(input.From)) {
        await adminMessage(input, res);
      } else {
        await userMessage(input, res);
      }
    } catch (err) {
      res.status(500).send(`Server error ${err}`);
      return;
    }
  }
);

app.post(
  "/voice",
  twilio.webhook({ validate: shouldValidate }),

  async function (req: Request, res: Response) {
    // Twilio Voice URL - receives incoming calls from Twilio
    const response = new VoiceResponse();

    response.say(
      `Tin Pan Sound is a new line of sound that is inspired by the late 20th
      century acoustic guitar with an orchestral approach. The line was designed
      to emphasize the harmoniousness of the sound. While the bass sounds are
      played through a different rhythm, they are not always perfect.

      Text this number to get updates. Text this number to get updates.
      Text this number to get updates. Text this number to get updates.
      Text this number to get updates. Text this number to get updates.
      Text this number to get updates. Text this number to get updates.

      Una mattina mi son svegliato.
      O bella ciao, bella ciao, bella ciao ciao ciao!
      Una mattina mi son svegliato.
      Eo ho trovato l'invasor.

      O partigiano porta mi via.
      O bella ciao, bella ciao, bella ciao ciao ciao!
      O partigiano porta mi via.
      Che mi sento di morir.`
    );

    res.set("Content-Type", "text/xml");
    res.send(response.toString());
  }
);

export async function server(port: number): Promise<void> {
  debug("Starting app...");
  checkEnv();
  const instance = await initDb();
  setInstance(instance);
  debug("Restoring stuff...");

  await numberStore.restore();
  await messageStore.restoreStatus();
  await messageStore.restoreMessage();

  return new Promise((resolve, reject) => {
    app.listen(port, () => resolve());
  });
}

if (require.main === module) {
  const port = parseInt(process.env["PORT"] ?? "", 10) || 3000;
  server(port).then(() => console.log("Listening on port " + port));
}
