import { createApp } from "./app";
import type { Env } from "./env";
import { extendOpenSeries } from "./lessons/jobs";
import { runMaintenance } from "./maintenance/jobs";
import { runNotificationJobs } from "./notifications/jobs";

const app = createApp();

export default {
  fetch: app.fetch,
  // Once an hour (see "triggers" in wrangler.jsonc): reminders, and the next lessons of repeats that have no end date.
  scheduled(_event, env, ctx) {
    // One job that fails must not stop the others.
    const jobs = [
      ["reminders", runNotificationJobs],
      ["repeating lessons", extendOpenSeries],
      ["clean up", runMaintenance],
    ] as const;
    ctx.waitUntil(
      (async () => {
        for (const [name, job] of jobs) {
          try {
            await job(env);
          } catch (err) {
            console.error(JSON.stringify({ msg: "scheduled job failed", job: name, err: String(err) }));
          }
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;
