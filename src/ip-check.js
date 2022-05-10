"use strict";

const debug = require("debug")("flashmob-sms:ip-check");
const ip = require("ip");

const clockworkIPs = [
  ip.cidrSubnet("89.248.48.192/27"),
  ip.cidrSubnet("89.248.58.16/28"),
];

function checkIP(req) {
  for (let i = 0; i < clockworkIPs.length; i++) {
    let mask = clockworkIPs[i];
    if (mask.contains(req.ip)) return true;
  }

  return false;
}

// Restrict requests to only those specified by Clockwork
// https://www.clockworksms.com/doc/reference/faqs/our-ip-addresses/
module.exports = function ipCheck(req, res, next) {
  if (process.env.RESTRICT_IP === "1" && !checkIP(req)) {
    debug("IP address " + req.ip + " rejected.");
    res.status(401);
    res.send("Access denied");
  } else {
    next();
  }
};
