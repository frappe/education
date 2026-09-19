export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  ENVIRONMENT: "local" | "test" | "staging" | "production";
  /** "dev" stores emails in the outbox table. Real sending is added after the email spike. */
  EMAIL_MODE: "dev" | "cloudflare";
  /** Public address of the app, used in email links. Never taken from the request. */
  APP_URL: string;
  /** Secret used to hash IP addresses and emails in counters and logs. Set with `wrangler secret`. */
  HMAC_KEY?: string;
  /** Cloudflare Turnstile secret. Required in staging and production. */
  TURNSTILE_SECRET?: string;
}

export interface Variables {
  requestId: string;
  actor: import("./auth/actor").Actor | null;
}

type Bindings = Env;

export type AppBindings = { Bindings: Env; Variables: Variables };

// Makes `env` from "cloudflare:workers" (used in tests) use the same type.
declare global {
  namespace Cloudflare {
    interface Env extends Bindings {}
  }
}
