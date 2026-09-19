import { argon2idAsync } from "@noble/hashes/argon2.js";
import { timingSafeEqual } from "../lib/crypto";

/**
 * Argon2id password hashing.
 * Pure JavaScript (@noble/hashes), because Workers do not allow WebAssembly to be
 * compiled at runtime (hash-wasm fails there, see docs/spikes.md).
 * Parameters follow the OWASP minimum: 19 MiB memory, 2 passes, 1 lane.
 */
export const ARGON2_PARAMS = { m: 19456, t: 2, p: 1, dkLen: 32 } as const;

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "");
}

function fromB64(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function derive(
  password: string,
  salt: Uint8Array,
  params: { m: number; t: number; p: number; dkLen: number },
) {
  return argon2idAsync(password.normalize("NFKC"), salt, { ...params, asyncTick: 10 });
}

/** Returns a PHC formatted string: $argon2id$v=19$m=..,t=..,p=..$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ARGON2_PARAMS);
  const { m, t, p } = ARGON2_PARAMS;
  return `$argon2id$v=19$m=${m},t=${t},p=${p}$${toB64(salt)}$${toB64(hash)}`;
}

interface Parsed {
  m: number;
  t: number;
  p: number;
  salt: Uint8Array;
  hash: Uint8Array;
}

function parse(encoded: string): Parsed | null {
  const match = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(
    encoded,
  );
  if (!match) return null;
  const [, m, t, p, salt, hash] = match;
  return { m: Number(m), t: Number(t), p: Number(p), salt: fromB64(salt!), hash: fromB64(hash!) };
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parsed = parse(encoded);
  if (!parsed) return false;
  // Refuse absurd parameters from a tampered value, so a bad row cannot burn CPU.
  if (parsed.m > 131072 || parsed.t > 10 || parsed.p > 4) return false;
  const actual = await derive(password, parsed.salt, {
    m: parsed.m,
    t: parsed.t,
    p: parsed.p,
    dkLen: parsed.hash.length,
  });
  return timingSafeEqual(toB64(actual), toB64(parsed.hash));
}

/** True when the stored hash uses weaker settings than today's, so it can be upgraded at next sign in. */
export function needsRehash(encoded: string): boolean {
  const parsed = parse(encoded);
  if (!parsed) return true;
  return parsed.m < ARGON2_PARAMS.m || parsed.t < ARGON2_PARAMS.t || parsed.p !== ARGON2_PARAMS.p;
}
