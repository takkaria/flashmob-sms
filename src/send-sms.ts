import request from "request";
import Debug from "debug";
const debug = Debug("flashmob-sms:send-sms");

type SMSParams = {
  to: string;
  content: string;
  key?: string;
  long?: 0 | 1;
};

export default function sendSMS(param: SMSParams, cb) {
  debug("Trying to send message...");

  param.key = process.env["API_KEY"] ?? "";
  param.long = 1;

  request
    .post("https://api.clockworksms.com/http/send.aspx")
    .form(param)
    .on("error", (err) => {
      debug(err);
      cb(err);
    })
    .on("response", () => {
      debug("Sent message to " + param.to + ".");
      cb();
    });
}
