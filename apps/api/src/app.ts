import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { ZodError } from "zod";
import { ERROR_CODES } from "@lms/shared";
import type { AppBindings } from "./env";
import { AppError, errorBody } from "./lib/errors";
import { loadActor } from "./middleware/auth";
import { csrfProtection } from "./middleware/csrf";
import { requestId } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import { assignments } from "./routes/assignments";
import { auth } from "./routes/auth";
import { courses } from "./routes/courses";
import { dev } from "./routes/dev";
import { enrollments } from "./routes/enrollments";
import { google } from "./routes/google";
import { grading } from "./routes/grading";
import { health } from "./routes/health";
import { invites } from "./routes/invites";
import { invoices } from "./routes/invoices";
import { lessons } from "./routes/lessons";
import { my } from "./routes/my";
import { notifications } from "./routes/notifications";
import { students } from "./routes/students";

/** The most a request can carry. */
export const MAX_REQUEST_BYTES = 512 * 1024;

export function createApp() {
  const app = new OpenAPIHono<AppBindings>({
    // Input that fails validation becomes a normal VALIDATION_FAILED error.
    defaultHook: (result) => {
      if (!result.success) throw result.error;
    },
  });

  app.use("*", requestId);
  app.use("*", securityHeaders);
  app.use("/api/*", csrfProtection);
  // Nothing the app sends is bigger than a few thousand characters, except a homework or a list of students to import.
  // A bigger request is refused before it is read, so nobody can fill the memory of the server.
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: MAX_REQUEST_BYTES,
      onError: (c) => c.json(errorBody(new AppError("TOO_LARGE"), c.get("requestId")), 413),
    }),
  );
  app.use("/api/*", loadActor);

  const api = new OpenAPIHono<AppBindings>();
  api.route("/", health);
  api.route("/", auth);
  api.route("/", google);
  api.route("/", invites);
  api.route("/", courses);
  api.route("/", students);
  api.route("/", enrollments);
  api.route("/", lessons);
  api.route("/", assignments);
  api.route("/", my);
  api.route("/", grading);
  api.route("/", invoices);
  api.route("/", notifications);
  api.route("/", dev);
  app.route("/api", api);

  // The API description is only public outside production.
  app.get("/api/openapi.json", (c) => {
    if (c.env.ENVIRONMENT === "production") throw new AppError("NOT_FOUND");
    return c.json(
      api.getOpenAPI31Document({
        openapi: "3.1.0",
        info: { title: "LMS API", version: "0.0.0" },
      }),
    );
  });

  app.notFound((c) => c.json(errorBody(new AppError("NOT_FOUND"), c.get("requestId")), 404));

  app.onError((err, c) => {
    const id = c.get("requestId");

    if (err instanceof AppError) {
      return c.json(errorBody(err, id), err.status as 400);
    }

    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "_";
        fields[key] ??= issue.message;
      }
      return c.json(errorBody(new AppError("VALIDATION_FAILED", { fields }), id), 400);
    }

    // Unknown error: log the detail for us, show nothing to the user.
    console.error(
      JSON.stringify({
        msg: "unhandled error",
        requestId: id,
        err: String(err),
        stack: (err as Error).stack,
      }),
    );
    return c.json(errorBody(new AppError("INTERNAL"), id), ERROR_CODES.INTERNAL.status);
  });

  return app;
}
