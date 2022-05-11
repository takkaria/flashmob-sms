import ip from "ip";
import type { Request, Response } from "express";

import Debug from "debug";
const debug = Debug("flashmob-sms:ip-check");

const clockworkIPs = [
  ip.cidrSubnet("89.248.48.192/27"),
  ip.cidrSubnet("89.248.58.16/28"),
];

function checkIP(ip: string) {
  for (const mask of clockworkIPs) {
    if (mask.contains(ip)) {
      return true;
    }
  }

  return false;
}

// Restrict requests to only those specified by Clockwork
// https://www.clockworksms.com/doc/reference/faqs/our-ip-addresses/
export default function ipCheck(req: Request, res: Response, next: () => void) {
  if (process.env["RESTRICT_IP"] === "1" && !checkIP(req.ip)) {
    debug("IP address " + req.ip + " rejected.");
    res.status(401);
    res.send("Access denied");
  } else {
    next();
  }
}
