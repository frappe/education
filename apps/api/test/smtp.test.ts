import { describe, expect, it } from "vitest";
import { getEmailProvider } from "../src/email/provider";
import {
  buildMessage,
  sendOverSmtp,
  SmtpError,
  type SmtpConfig,
  type SmtpTransport,
} from "../src/email/smtp-client";
import { env } from "cloudflare:workers";

const cfg: SmtpConfig = {
  user: "teacher@gmail.com",
  pass: "abcd efgh ijkl mnop",
  from: "teacher@gmail.com",
  fromName: "Lan Tran",
  hostname: "lms.example",
};
const mail = {
  kind: "invoice",
  to: "hoa@example.com",
  subject: "Your fee receipt",
  text: "Hello Hoa.\r\n.\r\nDot on a line.",
};

/**
 * A server that follows a script: each item is what it says after it has read what the client sent
 * (a line for a command, or the whole mail up to the lone dot). `greeting` is said first.
 */
function fakeServer(script: Record<string, string>, greeting = "220 mail.example ESMTP\r\n") {
  const received: string[] = [];
  let inbox = "";
  let inData = false;
  const queue: string[] = [greeting];
  let closed = false;
  const io: SmtpTransport = {
    read: async () => {
      const next = queue.shift();
      return next === undefined ? null : new TextEncoder().encode(next);
    },
    write: async (text) => {
      inbox += text;
      for (;;) {
        if (inData) {
          const end = inbox.indexOf("\r\n.\r\n");
          if (end < 0) return;
          received.push(inbox.slice(0, end));
          inbox = inbox.slice(end + 5);
          inData = false;
          queue.push(script["<message>"] ?? "250 queued\r\n");
          continue;
        }
        const eol = inbox.indexOf("\r\n");
        if (eol < 0) return;
        const line = inbox.slice(0, eol);
        inbox = inbox.slice(eol + 2);
        received.push(line);
        const key = Object.keys(script).find((k) => line.startsWith(k));
        if (line === "DATA") inData = true;
        if (key) queue.push(script[key]!);
      }
    },
    close: async () => {
      closed = true;
    },
  };
  return { io, received, isClosed: () => closed };
}

const happy = {
  EHLO: "250-mail.example\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n",
  AUTH: "235 2.7.0 Accepted\r\n",
  "MAIL FROM": "250 OK\r\n",
  "RCPT TO": "250 OK\r\n",
  DATA: "354 go ahead\r\n",
  "<message>": "250 queued\r\n",
};

const decodeBody = (raw: string) => {
  const body = raw.split("\r\n\r\n")[1]!.replace(/\r\n/g, "");
  return new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)));
};

describe("sending a mail over SMTP", () => {
  it("says the steps in order and keeps the words of the mail whole (even a lone dot and Vietnamese letters)", async () => {
    const s = fakeServer(happy);
    const text = "Chào Hoa,\r\n.\r\nPhiếu thu học phí tháng 9. Cảm ơn!";
    await sendOverSmtp(
      s.io,
      cfg,
      { ...mail, subject: "Phiếu thu học phí", text },
      new Date("2026-09-19T10:00:00Z"),
      "abc",
    );
    const [ehlo, auth, from, rcpt, data, message, quit] = s.received;
    expect(ehlo).toBe("EHLO lms.example");
    expect(auth).toBe(`AUTH PLAIN ${btoa("\0teacher@gmail.com\0abcd efgh ijkl mnop")}`);
    expect([from, rcpt, data, quit]).toEqual([
      "MAIL FROM:<teacher@gmail.com>",
      "RCPT TO:<hoa@example.com>",
      "DATA",
      "QUIT",
    ]);
    expect(message).toContain("Subject: =?UTF-8?B?");
    expect(message).toContain("From: Lan Tran <teacher@gmail.com>");
    expect(message).toContain("To: <hoa@example.com>");
    expect(message).toContain("Message-ID: <abc@lms.example>");
    expect(message).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(message).toContain("Content-Transfer-Encoding: base64");
    expect(message).toContain("Date: Sat, 19 Sep 2026 10:00:00 +0000");
    expect(decodeBody(message!)).toBe(text);
    expect(s.isClosed()).toBe(true);
  });

  it("writes a plain ASCII subject and name as they are, and an accented name in the safe form", () => {
    const plain = buildMessage(cfg, mail, new Date(0), "id");
    expect(plain).toContain("Subject: Your fee receipt\r\n");
    const accented = buildMessage({ ...cfg, fromName: "Trần Lan" }, mail, new Date(0), "id");
    expect(accented).toMatch(/^From: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?= <teacher@gmail.com>/);
    for (const line of accented.split("\r\n")) expect(line.length).toBeLessThanOrEqual(998);
  });

  it("wraps a long body in lines of at most 76 characters", () => {
    const raw = buildMessage(cfg, { ...mail, text: "x".repeat(5000) }, new Date(0), "id");
    const body = raw.split("\r\n\r\n")[1]!.split("\r\n").filter(Boolean);
    expect(body.length).toBeGreaterThan(1);
    for (const line of body) expect(line.length).toBeLessThanOrEqual(76);
  });

  it("reads an answer that comes in pieces, and one with many lines", async () => {
    const s = fakeServer(happy, "");
    const pieces = ["22", "0 mail.example\r", "\n"];
    let i = 0;
    const original = s.io.read;
    s.io.read = async () => (i < pieces.length ? new TextEncoder().encode(pieces[i++]!) : original());
    await expect(sendOverSmtp(s.io, cfg, mail)).resolves.toBeUndefined();
  });

  it("stops at the first answer that is not right, says which step and code, and closes the connection", async () => {
    const cases: [string, Record<string, string>, string, number][] = [
      ["greeting", {}, "greeting", 554],
      ["hello", { ...happy, EHLO: "500 nope\r\n" }, "hello", 500],
      ["sign in", { ...happy, AUTH: "535 5.7.8 Bad credentials\r\n" }, "sign in", 535],
      ["sender", { ...happy, "MAIL FROM": "550 no\r\n" }, "sender", 550],
      ["recipient", { ...happy, "RCPT TO": "550 no such user\r\n" }, "recipient", 550],
      ["data", { ...happy, DATA: "451 try later\r\n" }, "data", 451],
      ["message", { ...happy, "<message>": "552 too big\r\n" }, "message", 552],
    ];
    for (const [label, script, step, code] of cases) {
      const s = fakeServer(script, label === "greeting" ? "554 no service\r\n" : undefined);
      const err = await sendOverSmtp(s.io, cfg, mail).catch((e: unknown) => e);
      expect(err, label).toBeInstanceOf(SmtpError);
      expect((err as SmtpError).step, label).toBe(step);
      expect((err as SmtpError).code, label).toBe(code);
      expect(s.isClosed(), label).toBe(true);
      // The error never holds the password or the words of the mail.
      expect(String((err as Error).message), label).not.toMatch(/abcd|Hello Hoa|hoa@example/);
    }
  });

  it("fails when the server closes the connection in the middle", async () => {
    const s = fakeServer({ EHLO: happy.EHLO });
    const err = await sendOverSmtp(s.io, cfg, mail).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SmtpError);
    expect((err as SmtpError).step).toContain("connection closed");
  });

  it("refuses a line break in the address, the subject or the name, and an address that is not one, before it says anything", async () => {
    const bad: [string, Partial<SmtpConfig>, Partial<typeof mail>][] = [
      ["subject", {}, { subject: "Hi\r\nBcc: someone@example.com" }],
      ["to", {}, { to: "a@example.com\r\nRCPT TO:<b@example.com>" }],
      ["name", { fromName: "Lan\r\nBcc: x@example.com" }, {}],
      ["to without at", {}, { to: "hoa" }],
      ["to with angle brackets", {}, { to: "<a@example.com>" }],
      ["to with a space", {}, { to: "a b@example.com" }],
    ];
    for (const [label, c, m] of bad) {
      const s = fakeServer(happy);
      await expect(sendOverSmtp(s.io, { ...cfg, ...c }, { ...mail, ...m }), label).rejects.toBeInstanceOf(
        SmtpError,
      );
      expect(s.received, label).toEqual([]);
    }
  });
});

describe("choosing the SMTP mode", () => {
  it("is used when EMAIL_MODE is smtp, also outside production", () => {
    expect(getEmailProvider({ ...env, EMAIL_MODE: "smtp", ENVIRONMENT: "staging" })).toBeDefined();
    expect(getEmailProvider({ ...env, EMAIL_MODE: "smtp", ENVIRONMENT: "production" })).toBeDefined();
  });

  it("says clearly what is missing when the settings are not all there", async () => {
    const provider = getEmailProvider({
      ...env,
      EMAIL_MODE: "smtp",
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
    });
    await expect(provider.send(mail)).rejects.toThrow(/SMTP_HOST, SMTP_USER and SMTP_PASS/);
  });
});
