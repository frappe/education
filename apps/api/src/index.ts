import { createApp } from "./app";
import type { Env } from "./env";
import { runNotificationJobs } from "./notifications/jobs";

const app = createApp();

export default {
  fetch: app.fetch,
  // Every few minutes (see "triggers" in wrangler.jsonc): reminders and the emails that are waiting.
  scheduled(_event, env, ctx) {
    ctx.waitUntil(runNotificationJobs(env));
  },
} satisfies ExportedHandler<Env>;
