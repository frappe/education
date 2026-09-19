import { uuidv7 } from "../lib/id";
import type { EmailMessage, EmailProvider } from "./provider";

/**
 * Does not send anything. Stores the email in `email_outbox` so a developer can
 * read it (and copy the magic link). Must never be used with real users' data.
 */
export class DevEmailProvider implements EmailProvider {
  constructor(private readonly db: D1Database) {}

  async send(message: EmailMessage): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO email_outbox (id, kind, to_email, subject, body_text, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'logged', ?)`,
      )
      .bind(uuidv7(), message.kind, message.to, message.subject, message.text, new Date().toISOString())
      .run();
  }
}
