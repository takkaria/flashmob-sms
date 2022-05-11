import Debug from "debug";
import Bottleneck from "bottleneck";
import fetch from "isomorphic-fetch";

const debug = Debug("flashmob-sms:send-sms");

const b64 = (str: string) => new Buffer(str).toString("base64");

export async function sendSMS(
  recipient: string,
  content: string
): Promise<void> {
  debug(`Trying to send message "${content}" to ${recipient}...`);

  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];

  const params = new URLSearchParams();
  params.append("From", process.env["TWILIO_FROM"] ?? "");
  params.append("To", recipient);
  params.append("Body", content);

    let response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${b64(accountSid + ":" + authToken)}`,
        },
        body: params,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Response status ${response.status}: ${text}`);
    }

  debug(`Sent SMS to ${recipient}.`);
}

export async function sendBulkSMS(
  recipients: string[],
  content: string
): Promise<void> {
  const limiter = new Bottleneck({
    maxConcurrent: 4,
    minTime: 250,
  });
  await Promise.all(
    recipients.map(async (recipient): Promise<void> => {
      return limiter.schedule(() => sendSMS(recipient, content));
    })
  );
  limiter.on("error", () => {console.log("WHEEE")});
  debug("All messages send");
}
