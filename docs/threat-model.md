# Threat model (STRIDE) — version 0, M0

Reviewed again at the end of every milestone. Each row names the check that proves the control works.
Controls marked **(done)** exist and have tests. Controls marked **(M2)**, **(M3)** etc. are planned for that milestone and do not exist yet. M1 (sign in and tenants) is done.

## Assets

Student personal data (names, email, phone, work, grades, teacher notes) · sign-in sessions · invoices · uploaded files · the teacher's tenant data.

## Trust boundaries

Browser → Cloudflare edge → Worker → D1 / R2 · Worker → email service · Admin → Cloudflare Access → `/admin`.

## Threats and controls

| # | Threat (STRIDE) | Example | Control | Proof |
|---|---|---|---|---|
| 1 | Spoofing | Guess or steal a session | 256-bit random token, stored only as a hash, `__Host-` `HttpOnly` `Secure` `SameSite=Lax` cookie, new token at every sign in, idle 30 days on a device the person marked as their own (7 days for a teacher and 1 day for a student on a shared device), maximum 90 days **(done)** | `apps/api/test/auth.test.ts` (sessions) |
| 2 | Spoofing | Guess a way in | There are no passwords to guess. Links are 256-bit random values. Asking for links is limited per email (5 an hour) and per connection (10 an hour), with Turnstile. The answer and the timing are the same for every email, because the email is sent after the answer **(done)** | `auth.test.ts` (sign in with an email link, sent after the answer) |
| 3 | Spoofing | Steal a magic link from email | 15 minute life, used up in one atomic statement, hashed in DB, the page needs a button press so mail scanners cannot use it **(done)** | `auth.test.ts` (magic link, simultaneous clicks) |
| 4 | Tampering | CSRF: another site makes the browser change data | `SameSite=Lax`, `Sec-Fetch-Site` and `Origin` checks, required custom header, no CORS | `apps/api/test/csrf.test.ts` (done) |
| 5 | Tampering | SQL injection | Parameterised queries only (D1 `bind`, Drizzle), Zod validation on all input | Code review rule; tests **(M1+)** |
| 6 | Tampering | Change a grade or invoice silently | Audit log that refuses update and delete **(done)**; grade history table and invoice freeze **(M3, M4)** | `auth.test.ts` (audit) |
| 7 | Repudiation | "I never turned that in" | Audit log of sign in, sign up, invites **(done)**; receipts for turned-in work **(M3)** | `auth.test.ts` (audit) |
| 8 | Information disclosure | Teacher A reads teacher B's data (IDOR) | Every query scoped by tenant and actor in the repository layer; random ids; permission matrix in `packages/shared`; another tenant's row answers "not found" **(done for invites)** | `invites.test.ts` (cross-tenant), `policy.test.ts` |
| 9 | Information disclosure | Student reads another student's work | Policy layer with "own" and "enrolled" scopes, tested against every resource and action **(done)**; applied to real data from **(M2)** | `policy.test.ts` (158 generated cases) |
| 10 | Information disclosure | Secrets or magic links in logs / DB | No secrets in code; in real email mode the outbox keeps no body; API errors never show internals | `health.test.ts` (error shape) |
| 11 | Information disclosure | Uploaded file served as a web page (stored XSS) | Type allowlist, magic byte check, `attachment`, `nosniff`, `CSP: sandbox` **(M3)** | Malicious upload tests **(M3)** |
| 12 | Information disclosure | Malicious student link (phishing) | `https` only, no server fetch, domain shown, external link warning, `noopener` **(M3)** | Link tests **(M3)** |
| 13 | Denial of service | Flood login, sign up or email | Rate limits on sign up, asking for links, using links, invites, and 5 emails per hour per address **(done)**; general API limit through a Cloudflare WAF rule **(set up at deploy)**; upload quota **(M3)** | `auth.test.ts` |
| 14 | Denial of service | Heavy work in one request (Free plan allows 10 ms of CPU) | No password hashing. The heaviest remaining work (checking 200 CSV rows) is measured at about 2 ms cold and under 0.5 ms warm on a laptop. To confirm on Cloudflare after the first deploy | Benchmark in `docs/spikes.md` notes |
| 15 | Elevation of privilege | Student calls a teacher action | Central policy `can(actor, resource, action, target)`; permission matrix; a table of who may call each route, checked by tests (anonymous gets 401, student gets 403 on teacher routes) **(done)** | `access.test.ts`, `policy.test.ts` |
| 16 | Elevation of privilege | Reach the admin console | Cloudflare Access (SSO + MFA), Worker checks the Access token **(M5)** | Admin tests **(M5)** |
| 17 | Abuse | Use the platform to send spam | Teacher must confirm their own email before inviting, 50 invites a day, 5 emails an hour per address, sign up and reset always answer the same **(done)**; unsubscribe header **(M4)** | `invites.test.ts`, `auth.test.ts` |
| 18 | Tampering | Two requests take the last seat of a course, or a student of teacher B is put into teacher A's course | The seat limit and the same-tenant check are inside the single `INSERT` statement, and a database trigger refuses any enrollment that mixes tenants **(done)** | `apps/api/test/enrollments.test.ts` |
| 19 | Supply chain | Bad dependency or CI action | Lockfile, `pnpm audit` in CI, actions pinned by commit, install scripts allowed only for `esbuild` and `workerd` | `.github/workflows/lms-ci.yml` (done) |
| 20 | Spoofing | Sign in as someone else through Google: a forged or replayed Google answer, or someone else's sign in forced on the victim's browser (login CSRF) | Authorization code flow with PKCE. A random `state` and `nonce` are kept in a short (10 minute), signed, `HttpOnly` cookie that is removed when the person comes back. The id token must have the right issuer, audience (our client id only), expiry, nonce and `email_verified`. Its signature is not re-checked because it comes straight from Google over TLS (OpenID Connect Core 3.1.3.7). Errors are logged without Google's answer or the secret **(done)** | `apps/api/test/google.test.ts` (coming back, checking what Google says) |
| 21 | Elevation of privilege | Get into a teacher's class without being invited: sign in with any Google account | A student gets in only when a teacher added **and invited** exactly this email (compared exactly, only upper or lower case is ignored) and the invite is still valid. With an invite link the Google email must match before the link is used up. Nothing is created for an unknown email **(done)** | `google.test.ts` (students, opening the invite link first) |
| 22 | Spoofing | Take over an account by owning the same email on a new Google account (deleted account, reused address) | Google's own account id (`sub`) is what is linked. If the email already has a different Google account linked, the answer is `GOOGLE_ACCOUNT_CHANGED`; the email link still works as the way back **(done)** | `google.test.ts` (teachers) |
| 23 | Elevation of privilege | Use the local stand-in for Google on a real address | `GOOGLE_MODE=dev` is ignored (Google stays off) everywhere except a local machine and tests **(done)** | `google.test.ts` (the local stand-in) |

## Lessons from the old Frappe code

These mistakes are on the "never again" list (details in `docs/plan.md`, Section 1.2): no permission check on a write endpoint, trusting an id sent by the client, accepting any document type, trusting a payment signature without binding it to the invoice amount, and test code imported in production.
