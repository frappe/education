import { z } from "zod";
import type { Env } from "../env";
import { appUrl, isLocalOrTest } from "../lib/config";
import { fromBase64Url, toBase64UrlText } from "../lib/crypto";
import { AppError } from "../lib/errors";

/** What we learn about a person from Google. Only these three facts are used. */
export interface GoogleIdentity {
  /** Google's own id for the account. It never changes, even if the email does. */
  subject: string;
  /** Lower case, and Google has confirmed the person owns it. */
  email: string;
  name: string;
}

export interface GoogleClient {
  /** Where to send the browser so the person can pick their Google account. */
  authorizeUrl(p: { state: string; nonce: string; codeChallenge: string }): string;
  /** Trades the one-time `code` (that Google put in the redirect) for who the person is. */
  exchange(p: { code: string; codeVerifier: string; nonce: string }): Promise<GoogleIdentity>;
}

export const callbackUrl = (env: Env): string => `${appUrl(env)}/api/auth/google/callback`;

const claims = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  sub: z.string().min(1).max(255),
  email: z.string().min(3).max(254),
  email_verified: z.union([z.boolean(), z.literal("true")]),
  nonce: z.string().optional(),
  name: z.string().optional(),
});

/** Real Google (OpenID Connect, "authorization code" way, with PKCE). */
class LiveGoogle implements GoogleClient {
  constructor(
    private readonly env: Env,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  authorizeUrl(p: { state: string; nonce: string; codeChallenge: string }): string {
    const q = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: callbackUrl(this.env),
      response_type: "code",
      scope: "openid email profile",
      state: p.state,
      nonce: p.nonce,
      code_challenge: p.codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account", // never sign in silently as the wrong Google account
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }

  async exchange(p: { code: string; codeVerifier: string; nonce: string }): Promise<GoogleIdentity> {
    let res: Response;
    try {
      res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: p.code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: callbackUrl(this.env),
          grant_type: "authorization_code",
          code_verifier: p.codeVerifier,
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new AppError("GOOGLE_FAILED");
    }
    if (!res.ok) {
      // The body may explain (for example "invalid_grant" for an old code). Log only the status.
      console.error(JSON.stringify({ msg: "google code exchange refused", status: res.status }));
      throw new AppError("GOOGLE_FAILED");
    }
    const idToken = ((await res.json().catch(() => null)) as { id_token?: unknown } | null)?.id_token;
    if (typeof idToken !== "string") throw new AppError("GOOGLE_FAILED");

    // The id token came straight from Google over TLS in answer to our own request, so OpenID
    // Connect (Core 3.1.3.7) lets us skip checking its signature. We still check everything inside.
    let parsed: z.infer<typeof claims>;
    try {
      parsed = claims.parse(JSON.parse(fromBase64Url(idToken.split(".")[1] ?? "")));
    } catch {
      throw new AppError("GOOGLE_FAILED");
    }
    const audiences = Array.isArray(parsed.aud) ? parsed.aud : [parsed.aud];
    const ok =
      (parsed.iss === "https://accounts.google.com" || parsed.iss === "accounts.google.com") &&
      audiences.length === 1 &&
      audiences[0] === this.clientId &&
      parsed.exp * 1000 > Date.now() &&
      parsed.nonce === p.nonce &&
      // Without this, anyone could claim an email address they do not own.
      (parsed.email_verified === true || parsed.email_verified === "true");
    if (!ok) throw new AppError("GOOGLE_FAILED");

    const email = parsed.email.trim().toLowerCase();
    return { subject: parsed.sub, email, name: (parsed.name ?? "").trim() || email.split("@")[0]! };
  }
}

/**
 * Stand-in for Google on a developer's machine, so the whole flow can be tried without a Google
 * account or internet. The browser is sent to a small local page where you type any email; that page
 * returns a `code` that simply holds the email. It is refused on any deployed address.
 */
class DevGoogle implements GoogleClient {
  constructor(private readonly env: Env) {}

  authorizeUrl(p: { state: string; nonce: string; codeChallenge: string }): string {
    return `${appUrl(this.env)}/dev/google?${new URLSearchParams({ state: p.state })}`;
  }

  async exchange(p: { code: string }): Promise<GoogleIdentity> {
    try {
      const body = z
        .object({ email: z.email(), name: z.string().max(100) })
        .parse(JSON.parse(fromBase64Url(p.code.replace(/^dev\./, ""))));
      const email = body.email.trim().toLowerCase();
      return { subject: `dev-${email}`, email, name: body.name.trim() || email.split("@")[0]! };
    } catch {
      throw new AppError("GOOGLE_FAILED");
    }
  }
}

/** The code the local stand-in page hands back. Only used by tests and the dev page. */
export const devGoogleCode = (email: string, name: string): string =>
  `dev.${toBase64UrlText(JSON.stringify({ email, name }))}`;

/**
 * The Google client for this environment, or null when Google sign in is not set up (then the
 * buttons are hidden and the routes answer "not found"). The stand-in is never used outside a
 * local machine or tests, even if someone sets it by mistake.
 */
export function googleClient(env: Env): GoogleClient | null {
  if (env.GOOGLE_MODE === "dev") {
    if (!isLocalOrTest(env)) {
      console.error(JSON.stringify({ msg: "GOOGLE_MODE dev is not allowed here, Google sign in is off" }));
      return null;
    }
    return new DevGoogle(env);
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    return new LiveGoogle(env, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  }
  return null;
}
