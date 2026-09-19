import type { Context } from "hono";
import type { ZodType } from "zod";
import type { AppBindings } from "../env";
import { AppError } from "../lib/errors";

/** Reads the JSON body and checks it. A bad body becomes a normal VALIDATION_FAILED error. */
export async function parseBody<T>(c: Context<AppBindings>, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new AppError("VALIDATION_FAILED");
  }
  return schema.parse(raw); // a ZodError is turned into VALIDATION_FAILED with fields by the app error handler
}

/** The same answer whether or not something happened, for requests that must not reveal account details. */
export const accepted = (c: Context<AppBindings>) => c.json({ ok: true }, 202);
