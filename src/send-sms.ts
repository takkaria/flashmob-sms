import request from "request";
import Debug from "debug";
const debug = Debug("flashmob-sms:send-sms");

type SMSParams = {
  to: string;
  content: string;
  key?: string;
  long?: 0 | 1;
};

export async function sendSMS(param: SMSParams): Promise<void> {
  debug("Trying to send message...");

  param.key = process.env["API_KEY"] ?? "";
  param.long = 1;

  return new Promise((resolve, reject) =>
    request
      .post("https://api.clockworksms.com/http/send.aspx")
      .form(param)
      .on("error", (err) => {
        if (err.name === 'NetConnectNotAllowedError') {
          // Handle mocker errors
          resolve();
        } else {
          debug(err);
          reject(err);
        }
      })
      .on("response", () => {
        debug("Sent message to " + param.to + ".");
        resolve();
      })
  );
}
