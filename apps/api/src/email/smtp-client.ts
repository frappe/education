import type { EmailMessage } from "./provider";

/** One open connection to a mail server, as far as this file cares. Real sockets and the tests both fit it. */
export interface SmtpTransport {
  /** The next bytes from the server, or null when the server closed the connection. */
  read(): Promise<Uint8Array | null>;
  write(text: string): Promise<void>;
  close(): Promise<void>;
}

export interface SmtpConfig {
  user: string;
  pass: string;
  /** The address the mail comes from. For most services it must be the address that signed in. */
  from: string;
  fromName: string;
  /** The name this program gives itself in EHLO. */
  hostname: string;
}

/** The server said no, or said something we did not expect. The text never holds the password or the mail. */
export class SmtpError extends Error {
  constructor(
    readonly step: string,
    readonly code: number | null,
  ) {
    super(`smtp ${step} failed${code ? ` (${code})` : ""}`);
    this.name = "SmtpError";
  }
}

const EMAIL = /^[^\s<>@",;:\\]+@[^\s<>@",;:\\]+\.[^\s<>@",;:\\]+$/;
const hasBreak = (v: string) => /[\r\n\0]/.test(v);

const b64 = (bytes: Uint8Array | string): string => {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let bin = "";
  for (let i = 0; i < data.length; i += 0x8000) bin += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(bin);
};

/** A header value that may hold any letters: plain when it is ASCII, else the "=?UTF-8?B?...?=" form. */
function encodedWord(text: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  return `=?UTF-8?B?${b64(text)}?=`;
}

/** Wraps base64 at 76 characters, as mail servers expect. */
const wrap76 = (s: string) => s.match(/.{1,76}/g)?.join("\r\n") ?? "";

/** The whole mail as text: headers, an empty line, and the body as base64 (so no letter or dot can break the protocol). */
export function buildMessage(cfg: SmtpConfig, msg: EmailMessage, now: Date, id: string): string {
  const name = cfg.fromName ? `${encodedWord(cfg.fromName)} ` : "";
  return [
    `From: ${name}<${cfg.from}>`,
    `To: <${msg.to}>`,
    `Subject: ${encodedWord(msg.subject)}`,
    `Date: ${now.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}@${cfg.hostname}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(msg.text)),
    "",
  ].join("\r\n");
}

/** Reads one full answer of the server (an answer can have many lines; the last one has a space after the code). */
async function answer(io: SmtpTransport, step: string, buffer: { text: string }): Promise<number> {
  const decoder = new TextDecoder();
  for (;;) {
    const lines = buffer.text.split("\r\n");
    const last = lines.length - 1; // the piece after the last line break may be half a line
    for (let i = 0; i < last; i++) {
      const m = /^(\d{3})([ -])/.exec(lines[i]!);
      if (m && m[2] === " ") {
        buffer.text = lines.slice(i + 1).join("\r\n");
        return Number(m[1]);
      }
    }
    const chunk = await io.read();
    if (chunk === null) throw new SmtpError(`${step} (connection closed)`, null);
    buffer.text += decoder.decode(chunk, { stream: true });
    if (buffer.text.length > 65_536) throw new SmtpError(`${step} (answer too long)`, null);
  }
}

/**
 * Sends one mail over a connection that is already secure (TLS from the first byte, port 465).
 * Steps: greeting, EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, QUIT. Any answer that is not the expected
 * kind stops the send with an error that names the step and the code, and never the password or the mail.
 */
export async function sendOverSmtp(
  io: SmtpTransport,
  cfg: SmtpConfig,
  msg: EmailMessage,
  now: Date = new Date(),
  id: string = crypto.randomUUID(),
): Promise<void> {
  // Nothing that could start a new line may get into a header or a command.
  for (const v of [msg.to, msg.subject, cfg.from, cfg.fromName, cfg.user, cfg.hostname]) {
    if (hasBreak(v)) throw new SmtpError("input (line break)", null);
  }
  if (!EMAIL.test(msg.to) || !EMAIL.test(cfg.from)) throw new SmtpError("input (address)", null);

  const buffer = { text: "" };
  const expect = async (step: string, ok: number[]) => {
    const code = await answer(io, step, buffer);
    if (!ok.includes(code)) throw new SmtpError(step, code);
  };
  const say = async (step: string, line: string, ok: number[]) => {
    await io.write(`${line}\r\n`);
    await expect(step, ok);
  };

  try {
    await expect("greeting", [220]);
    await say("hello", `EHLO ${cfg.hostname}`, [250]);
    await say("sign in", `AUTH PLAIN ${b64(`\0${cfg.user}\0${cfg.pass}`)}`, [235]);
    await say("sender", `MAIL FROM:<${cfg.from}>`, [250]);
    await say("recipient", `RCPT TO:<${msg.to}>`, [250, 251]);
    await say("data", "DATA", [354]);
    await io.write(`${buildMessage(cfg, msg, now, id)}\r\n.\r\n`);
    await expect("message", [250]);
    await io.write("QUIT\r\n"); // politeness only: the mail is already accepted
  } finally {
    await io.close().catch(() => undefined);
  }
}
