import type { Env } from "../env";
import { DevEmailProvider } from "./dev-provider";
import { SmtpEmailProvider } from "./smtp-provider";

export interface EmailMessage {
  /** What the email is for, e.g. "magic_link", "invite", "invoice". */
  kind: string;
  to: string;
  subject: string;
  text: string;
}

/**
 * The rest of the app only knows this interface. Switching from the dev adapter to
 * Cloudflare Email Service (or any other service) means adding one adapter here.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export function getEmailProvider(env: Env): EmailProvider {
  if (env.EMAIL_MODE === "dev") {
    // The dev outbox keeps links that sign people in. It must never run with real users.
    if (env.ENVIRONMENT === "production") throw new Error("EMAIL_MODE dev is not allowed in production");
    return new DevEmailProvider(env.DB);
  }
  if (env.EMAIL_MODE === "smtp") return new SmtpEmailProvider(env);
  throw new Error(`EMAIL_MODE "${String(env.EMAIL_MODE)}" is not available`);
}
