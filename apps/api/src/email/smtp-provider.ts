import { connect } from "cloudflare:sockets";
import type { Env } from "../env";
import type { EmailMessage, EmailProvider } from "./provider";
import { sendOverSmtp, SmtpError, type SmtpTransport } from "./smtp-client";

const TIMEOUT_MS = 15_000;

/** Sends mail through an SMTP server such as Gmail (port 465, TLS from the first byte). */
export class SmtpEmailProvider implements EmailProvider {
  constructor(private readonly env: Env) {}

  async send(message: EmailMessage): Promise<void> {
    const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = this.env;
    if (!host || !user || !pass)
      throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS must be set for EMAIL_MODE smtp");
    const port = Number(this.env.SMTP_PORT ?? "465");
    const socket = connect({ hostname: host, port }, { secureTransport: "on", allowHalfOpen: false });
    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    const encoder = new TextEncoder();
    const io: SmtpTransport = {
      read: async () => {
        const r = await reader.read();
        return r.done ? null : r.value;
      },
      write: (text) => writer.write(encoder.encode(text)),
      close: async () => {
        await socket.close();
      },
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SmtpError("timeout", null)), TIMEOUT_MS);
    });
    try {
      await Promise.race([
        sendOverSmtp(
          io,
          {
            user,
            pass,
            from: this.env.SMTP_FROM || user,
            fromName: this.env.SMTP_FROM_NAME ?? "",
            hostname: "lms.workers.dev",
          },
          message,
        ),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
      await socket.close().catch(() => undefined);
    }
  }
}
