import type { ErrorCode } from "@lms/shared";
import { Hono } from "hono";
import { z } from "zod";
import { signInWithGoogle } from "../auth/google";
import { makeCtx } from "../auth/service";
import { setSessionCookie } from "../auth/session";
import type { AppBindings } from "../env";
import { googleClient } from "../google/client";
import { FLOW_MINUTES, saveFlow, takeFlow, type Flow } from "../google/flow";
import { randomToken, sha256Base64Url, timingSafeEqual } from "../lib/crypto";
import { AppError } from "../lib/errors";
import { isTokenValid } from "../repos/tokens";
import { hit } from "../security/rate-limit";

/**
 * "Continue with Google". Two browser trips: /start sends the person to Google, and Google sends
 * them back to /callback. These are normal page visits (not fetch calls), so they answer with
 * redirects. A problem is shown on the sign in page as `?error=CODE`.
 */
export const google = new Hono<AppBindings>();

const startQuery = z.object({
  intent: z.enum(["sign-in", "sign-up", "invite"]).default("sign-in"),
  invite: z.string().min(20).max(200).optional(),
  keep: z.enum(["0", "1"]).default("1"),
});

/** Only codes the sign in page knows how to explain. Anything else is shown as a general problem. */
const SHOWN: ErrorCode[] = [
  "GOOGLE_FAILED",
  "NOT_INVITED",
  "GOOGLE_ACCOUNT_CHANGED",
  "LINK_EXPIRED",
  "ACCOUNT_PAUSED",
  "RATE_LIMITED",
];

function fail(c: { redirect: (to: string) => Response }, error: unknown, invite?: string): Response {
  const code: ErrorCode =
    error instanceof AppError && SHOWN.includes(error.code as ErrorCode) ? error.code : "INTERNAL";
  if (!(error instanceof AppError)) {
    console.error(JSON.stringify({ msg: "google sign in failed", err: String(error) }));
  }
  // A student who used the wrong Google account goes back to their invite and can try another one.
  const target =
    invite && code !== "LINK_EXPIRED"
      ? `/accept-invite?${new URLSearchParams({ token: invite, error: code })}`
      : `/sign-in?${new URLSearchParams({ error: code })}`;
  return c.redirect(target);
}

google.get("/auth/options", (c) => c.json({ google: googleClient(c.env) !== null }));

google.get("/auth/google/start", async (c) => {
  const client = googleClient(c.env);
  if (!client) throw new AppError("NOT_FOUND");
  const q = startQuery.safeParse(c.req.query());
  if (!q.success || (q.data.intent === "invite") !== (q.data.invite !== undefined)) {
    return fail(c, new AppError("GOOGLE_FAILED"));
  }
  const ctx = await makeCtx(c);
  try {
    if (!(await hit(c.env.DB, `google:ip:${ctx.ipHash}`, 30, 3600)).allowed) {
      throw new AppError("RATE_LIMITED");
    }
    if (q.data.invite && !(await isTokenValid(c.env.DB, q.data.invite, "invite"))) {
      throw new AppError("LINK_EXPIRED");
    }
    const flow: Flow = {
      state: randomToken(),
      nonce: randomToken(),
      verifier: randomToken(),
      intent: q.data.intent,
      invite: q.data.invite,
      keep: q.data.keep === "1",
      until: Date.now() + FLOW_MINUTES * 60_000,
    };
    await saveFlow(c, flow);
    return c.redirect(
      client.authorizeUrl({
        state: flow.state,
        nonce: flow.nonce,
        codeChallenge: await sha256Base64Url(flow.verifier),
      }),
    );
  } catch (err) {
    return fail(c, err, q.data.invite);
  }
});

google.get("/auth/google/callback", async (c) => {
  const client = googleClient(c.env);
  if (!client) throw new AppError("NOT_FOUND");
  // The cookie is removed here, so a second visit with the same address cannot start anything.
  const flow = await takeFlow(c);
  const state = c.req.query("state");
  const code = c.req.query("code");
  if (!flow || !state || !timingSafeEqual(state, flow.state)) return fail(c, new AppError("GOOGLE_FAILED"));
  // The person pressed "Cancel" at Google, or Google refused. Nothing to explain, just go back.
  if (!code || c.req.query("error")) {
    return c.redirect(
      flow.invite ? `/accept-invite?${new URLSearchParams({ token: flow.invite })}` : "/sign-in",
    );
  }
  try {
    const identity = await client.exchange({ code, codeVerifier: flow.verifier, nonce: flow.nonce });
    setSessionCookie(c, await signInWithGoogle(await makeCtx(c), identity, flow));
    return c.redirect("/");
  } catch (err) {
    return fail(c, err, flow.invite);
  }
});
