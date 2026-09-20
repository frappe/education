import { createApp } from "./app";
import type { Env } from "./env";
import { extendOpenSeries } from "./lessons/jobs";
import { runNotificationJobs } from "./notifications/jobs";

const app = createApp();

export default {
  fetch: app.fetch,
  // Once an hour (see "triggers" in wrangler.jsonc): reminders, and the next lessons of repeats that have no end date.
  scheduled(_event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        await runNotificationJobs(env);
        await extendOpenSeries(env);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
