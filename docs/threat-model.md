# Threat model (STRIDE) — version 0, M0

Reviewed again at the end of every milestone. Each row names the check that proves the control works.
Controls marked **(M1)** etc. are planned for that milestone and do not exist yet.

## Assets

Student personal data (names, email, phone, work, grades, teacher notes) · sign-in sessions · invoices · uploaded files · the teacher's tenant data.

## Trust boundaries

Browser → Cloudflare edge → Worker → D1 / R2 · Worker → email service · Admin → Cloudflare Access → `/admin`.

## Threats and controls

| # | Threat (STRIDE) | Example | Control | Proof |
|---|---|---|---|---|
| 1 | Spoofing | Guess or steal a session | 256-bit random token, stored only as a hash, `__Host-` `HttpOnly` `Secure` `SameSite=Lax` cookie, rotation on sign in **(M1)** | Auth tests **(M1)** |
| 2 | Spoofing | Password guessing | Argon2id, lockout after 5 tries, Turnstile, same message for unknown email **(M1)** | Auth tests **(M1)** |
| 3 | Spoofing | Steal a magic link from email | 15 minute life, one use, hashed in DB **(M1)** | Auth tests **(M1)** |
| 4 | Tampering | CSRF: another site makes the browser change data | `SameSite=Lax`, `Sec-Fetch-Site` and `Origin` checks, required custom header, no CORS | `apps/api/test/csrf.test.ts` (done) |
| 5 | Tampering | SQL injection | Parameterised queries only (D1 `bind`, Drizzle), Zod validation on all input | Code review rule; tests **(M1+)** |
| 6 | Tampering | Change a grade or invoice silently | Grade history table, invoice frozen after send, audit log **(M2-M4)** | Domain tests |
| 7 | Repudiation | "I never turned that in" | Server-side timestamps, receipts, audit log **(M1, M3)** | Domain tests |
| 8 | Information disclosure | Teacher A reads teacher B's data (IDOR) | Every query scoped by tenant and actor in the repository layer; random ids; permission matrix in `packages/shared` | Cross-tenant test suite **(M1, runs in CI)** |
| 9 | Information disclosure | Student reads another student's work | Access only through the student's own rows | Permission matrix tests **(M1)** |
| 10 | Information disclosure | Secrets or magic links in logs / DB | No secrets in code; in real email mode the outbox keeps no body; API errors never show internals | `health.test.ts` (error shape) |
| 11 | Information disclosure | Uploaded file served as a web page (stored XSS) | Type allowlist, magic byte check, `attachment`, `nosniff`, `CSP: sandbox` **(M3)** | Malicious upload tests **(M3)** |
| 12 | Information disclosure | Malicious student link (phishing) | `https` only, no server fetch, domain shown, external link warning, `noopener` **(M3)** | Link tests **(M3)** |
| 13 | Denial of service | Flood login, uploads or email | Rate limits (plan 4.5), Cloudflare WAF, upload quota **(M1, M3)** | Rate limit tests |
| 14 | Denial of service | Slow password hash used as a CPU attack | Rate limit before hashing; parameters capped when verifying | `password.test.ts` (done) |
| 15 | Elevation of privilege | Student calls a teacher action | Central policy `can(actor, action, resource)`; permission matrix; route tests generated from the matrix | Authorization matrix tests **(M1)** |
| 16 | Elevation of privilege | Reach the admin console | Cloudflare Access (SSO + MFA), Worker checks the Access token **(M5)** | Admin tests **(M5)** |
| 17 | Abuse | Use the platform to send spam | Verified teacher email, daily invite limit, unsubscribe header **(M1, M4)** | Email tests **(M4)** |
| 18 | Supply chain | Bad dependency or CI action | Lockfile, `pnpm audit` in CI, actions pinned by commit, install scripts allowed only for `esbuild` and `workerd` | `.github/workflows/lms-ci.yml` (done) |

## Lessons from the old Frappe code

These mistakes are on the "never again" list (details in `docs/plan.md`, Section 1.2): no permission check on a write endpoint, trusting an id sent by the client, accepting any document type, trusting a payment signature without binding it to the invoice amount, and test code imported in production.
