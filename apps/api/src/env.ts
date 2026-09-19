export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  ENVIRONMENT: "local" | "test" | "staging" | "production";
  /** "dev" stores emails in the outbox table. Real sending is added after the email spike. */
  EMAIL_MODE: "dev" | "cloudflare";
}

export interface Variables {
  requestId: string;
}

type Bindings = Env;

export type AppBindings = { Bindings: Env; Variables: Variables };

// Makes `env` from "cloudflare:workers" (used in tests) use the same type.
declare global {
  namespace Cloudflare {
    interface Env extends Bindings {}
  }
}
