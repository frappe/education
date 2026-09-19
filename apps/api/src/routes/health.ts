import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { AppBindings } from "../env";

const HealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "error"]),
  time: z.string(),
});

const route = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Is the service running?",
  responses: {
    200: {
      description: "Service status",
      content: { "application/json": { schema: HealthSchema } },
    },
  },
});

export const health = new OpenAPIHono<AppBindings>().openapi(route, async (c) => {
  let database: "ok" | "error" = "ok";
  try {
    await c.env.DB.prepare("SELECT 1").first();
  } catch (err) {
    console.error(
      JSON.stringify({
        msg: "health: database check failed",
        requestId: c.get("requestId"),
        err: String(err),
      }),
    );
    database = "error";
  }
  // Only status words are returned. No versions, no names, nothing useful to an attacker.
  return c.json({
    status: database === "ok" ? ("ok" as const) : ("degraded" as const),
    database,
    time: new Date().toISOString(),
  });
});
