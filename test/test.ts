import { expect } from "chai";
import nock from "nock";
import fetch from "isomorphic-fetch";
import { server } from "../src/server";

nock.disableNetConnect();
nock.enableNetConnect("localhost");

// ====== App init

const appPort = 4000;
const appUrl = `http://localhost:${appPort}/sms`;

const normalNumber = "44NORMAL";
const adminNumber = "44ADMIN";
const accountSid = "testing";

before(function (done) {
  this.timeout(5000);
  process.env["TWILIO_FROM"] = "441231231234";
  process.env["TWILIO_ACCOUNT_SID"] = accountSid;
  process.env["TWILIO_AUTH_TOKEN"] = "testing";
  process.env["ALLOWED_NUMBERS"] = adminNumber;
  server(appPort).then(done);
});

// ====== Test helpers

type SendSMSParams = {
  from?: string;
  content?: string;
  statusCode?: number;
  response?: nock.Scope[] | nock.Scope;
  noResponse?: nock.Scope;
};

async function sendSMS(params: SendSMSParams): Promise<void> {
  // Turn params.response into an array
  if (params.response && !Array.isArray(params.response)) {
    params.response = [params.response];
  }

  const response = await fetch(appUrl, {
    method: "POST",
    // @ts-ignore
    body: new URLSearchParams({
      From: params.from ?? normalNumber,
      Body: params.content ?? "",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log("NOT OK RESPONSE:", text);
  }

  expect(response.status).to.equal(params.statusCode ?? 200);

  if (params.response) {
    for (const response of params.response) {
      expect(response.isDone()).to.equal(true);
    }
  }

  if (params.noResponse) {
    expect(params.noResponse.isDone()).to.equal(false);
  }
}

type ExpectedParams = {
  To?: string;
  Body?: RegExp | string;
};

function expectSMS(param: ExpectedParams = {}): nock.Scope {
  return nock("https://api.twilio.com")
    .post(`/2010-04-01/Accounts/${accountSid}/Messages.json`, (body) => {
      if (param.To && param.To !== body.To) {
        return false;
      }
      if (param.Body) {
        if (typeof param.Body === "string") {
          if (param.Body !== body.Body) {
            return false;
          }
        } else if (body.Body.match(param.Body) === null) {
          return false;
        }
      }
      return true;
    })
    .reply(200, "XXX Fill me out properly");
}

// ====== Testing proper

describe("If I post to the endpoint", function () {
  it("(assuming RESTRICT_IP=1) I should receive an error", function () {
    process.env["RESTRICT_IP"] = "1";
    return sendSMS({
      statusCode: 401,
    });
  });

  it("(assuming RESTRICT_IP=0) I should not receive an error", function () {
    process.env["RESTRICT_IP"] = "0";
    return sendSMS({
      statusCode: 200,
    });
  });
});

describe("Testing admin commands.  Assume all following sent from admin number", function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('If I send "wipe"', function () {
    it("I should be told all data is wiped", function () {
      return sendSMS({
        from: adminNumber,
        content: "wipe",
        response: expectSMS({ Body: /wiped/ }),
      });
    });

    it("& then if I turn on the responder", function () {
      return sendSMS({
        from: adminNumber,
        content: "on",
        response: expectSMS({ To: adminNumber, Body: /turned on/ }),
      });
    });

    it("& make an update, no message should be sent out", function () {
      return sendSMS({
        from: adminNumber,
        content: "update Testy McTesterson",
        response: expectSMS({ To: adminNumber, Body: /update/ }),
        noResponse: expectSMS(),
      });
    });
  });

  describe("If I send an empty message", function () {
    it("I should not receive a response", function () {
      return sendSMS({
        from: adminNumber,
        noResponse: expectSMS(),
      });
    });
  });

  describe('If I send "update:"', function () {
    it("I should recieve an error", function () {
      return sendSMS({
        from: adminNumber,
        content: "update: testing",
        response: expectSMS({ Body: /not recognised/ }),
      });
    });
  });

  describe('If I send "ON"', function () {
    it("I should receive confirmation of change", function () {
      return sendSMS({
        from: adminNumber,
        content: "ON",
        response: expectSMS({ Body: /on/ }),
      });
    });
  });

  describe('If I send "on"', function () {
    it("I should receive confirmation of change", function () {
      return sendSMS({
        from: adminNumber,
        content: "on",
        response: expectSMS({ Body: /on/ }),
      });
    });

    it("sending another SMS (from non admin number) should get me a message", function () {
      return sendSMS({
        from: normalNumber,
        response: expectSMS({ To: normalNumber }),
      });
    });
  });

  describe('If I send "off"', function () {
    it("I should receive confirmation of change", function () {
      return sendSMS({
        from: adminNumber,
        content: "off",
        response: expectSMS({ Body: /off/ }),
      });
    });

    it("sending another SMS (from non admin number) should get me no message", function () {
      return sendSMS({
        noResponse: expectSMS(),
      });
    });
  });

  describe('If I send "update" (from a non admin number)', function () {
  it("(assuming responses are turned on)", () => {
    return sendSMS({
      from: adminNumber,
      content: "on",
      response: expectSMS({ To: adminNumber, Body: /turned on/ }),
    });
  });

    it("it should be treated as an empty text & I should receive a reply", function () {
      return sendSMS({
        content: "update blah",
        response: expectSMS({ Body: /^((?!blah).)*$/ }),
      });
    });
  });

  describe('If I send "update Testing 1234"', function () {
    const newMessage = "Testing 1234";

    it("(wipe data first)", function () {
      return sendSMS({
        from: adminNumber,
        content: "wipe",
        response: expectSMS(),
      });
    });

    it("(turn on the responder again)", function () {
      return sendSMS({
        from: adminNumber,
        content: "on",
        response: expectSMS(),
      });
    });

    it("I should receive confirmation of change", function () {
      return sendSMS({
        from: adminNumber,
        content: "update " + newMessage,
        response: expectSMS({ To: adminNumber, Body: /updated/ }),
      });
    });

    it("sending another SMS (from a non admin number) should get me the new message", function () {
      return sendSMS({
        from: normalNumber,
        response: expectSMS({ To: normalNumber, Body: newMessage }),
      });
    });
  });

  describe('If I send "update" (and nothing else) from an admin number', function () {
    it("I should receive an error", function () {
      return sendSMS({
        from: adminNumber,
        content: "update",
        response: expectSMS({ Body: /error/i }),
      });
    });
  });

  describe('If I send "update <180 characters>" from an admin number', function () {
    it("(wipe data first)", function () {
      return sendSMS({
        from: adminNumber,
        content: "wipe",
        response: expectSMS(),
      });
    });

    it("(turn on the responder again)", function () {
      return sendSMS({
        from: adminNumber,
        content: "on",
        response: expectSMS(),
      });
    });

    it("I should be told it will use 2 SMSes when distributed", function () {
      let long = "x".repeat(180);
      return sendSMS({
        from: adminNumber,
        content: "update " + long,
        response: expectSMS({ Body: /2/i }),
      });
    });
  });
});

describe("Testing update distribution", function () {
  it("(assuming responses are turned on)", () => {
    return sendSMS({
      from: adminNumber,
      content: "on",
      response: expectSMS({ To: adminNumber, Body: /turned on/ }),
    });
  });

  it("if I send an empty SMS from a non admin number", function () {
    return sendSMS({
      from: normalNumber,
      response: expectSMS({ To: normalNumber }),
    });
  });

  it("and then update the message text, the update should be sent to the non admin number", function () {
    return sendSMS({
      from: adminNumber,
      content: "update amazingtime",
      response: [
        expectSMS({ Body: /updated/, To: adminNumber }),
        expectSMS({ Body: /amazingtime/, To: normalNumber }),
      ],
    });
  });

  describe("Testing 50 users", function () {
    this.timeout(5000);

    let allNumbers = [];
    for (let i = 0; i < 49; i++) {
      allNumbers.push("0790" + (1000000 + i));
    }

    for (let number of allNumbers) {
      before(() =>
        sendSMS({ from: number, response: expectSMS({ To: number }) })
      );
    }

    it("if I ask for a status update, 50 recipients should be mentioned", function () {
      return sendSMS({
        from: adminNumber,
        content: "status",
        response: expectSMS({ Body: /50/ }),
      });
    });
  });
});
