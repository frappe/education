# M0 spikes

Results of the technical checks planned for M0 (see `docs/plan.md`, Section 7).

## 1. Argon2id password hashing on Workers — DONE

**Question:** can we hash passwords with Argon2id inside a Worker, and how long does it take?

| Option | Result |
|---|---|
| `hash-wasm` (WebAssembly) | **Does not work.** Fails with `CompileError: WebAssembly.compile(): Wasm code generation disallowed by embedder`. Workers do not allow WebAssembly to be compiled from bytes at runtime. |
| `@noble/hashes` (pure JavaScript) | **Works.** Measured in the Workers runtime (workerd, local machine): m=19 MiB t=2 p=1 → **149 ms**; m=12 MiB t=3 → 120 ms; m=64 MiB t=3 → 643 ms. |
| PBKDF2 (WebCrypto) | Not used. workerd limits it to 100,000 rounds, below the OWASP advice (600,000). |

**Decision:** `@noble/hashes` Argon2id with the OWASP minimum (m=19456 KiB, t=2, p=1). Code: `apps/api/src/auth/password.ts`.

**Still to verify after the first real deploy:** local time is not the same as time on Cloudflare's servers. Check CPU time in the Workers dashboard for a sign-in request. The Free plan has a 10 ms CPU limit, so the **Workers Paid plan is required** (its default limit is 30 s and can be raised with `limits.cpu_ms`). If real CPU time is too high, lower `m`, or hash on a separate Worker.

## 2. Cloudflare Email Service — PARTLY DONE

**Question:** can we send real email (magic links, invoices)?

- The Cloudflare docs list Email Service outbound sending as **Beta**, on the **Workers Paid** plan. Sending only to addresses verified in the account is free on every plan.
- Sending to any address (students) is expected to need a **domain added to Cloudflare** with SPF/DKIM. We decided not to buy a domain yet, so this **cannot be tested** with only `*.workers.dev`.
- Not verified: limits, delivery speed, and inbox rate. Needs a domain and a Cloudflare account.

**Decision for now:** email runs in **dev mode**. `DevEmailProvider` (`apps/api/src/email/dev-provider.ts`) stores each message in the `email_outbox` table instead of sending it. `getEmailProvider` refuses any other mode, so mail can never be dropped silently. Everything through M3 works this way.

**Before M4 / beta:** attach any domain to Cloudflare, add a Cloudflare adapter to `EmailProvider`, and run the delivery checks. If the Beta limits are not good enough, add an adapter for Resend or Postmark. No other code changes.

## 3. Other findings

- `@cloudflare/vitest-pool-workers` needs Vitest 4 (not 5). `vue-tsc` needs TypeScript 5 (not 7), so `apps/web` uses TypeScript 5 and `apps/api` uses TypeScript 7.
- The installed workerd supports compatibility dates up to 2026-08-22, so `wrangler.jsonc` uses `2026-08-01`.
