# Production

How the app goes live, how it is kept safe, and what to do when something goes wrong.
The address is `https://ptv-lms.<account>.workers.dev` (Cloudflare Workers Free plan, no custom domain).
Staging is the place to try everything first: `https://ptv-lms-staging.<account>.workers.dev`.

## 1. Go-live checklist

Done by the team (in the repository and on staging):

- [x] Production settings in `apps/api/wrangler.jsonc` (its own name, its own database, `EMAIL_MODE=smtp`, hourly schedule, no local Google stand-in).
- [x] `node scripts/preflight-production.mjs` refuses unsafe settings (placeholders, staging's database, test outbox for email, no schedule, secrets missing with `--secrets`).
- [x] `bash scripts/smoke.sh <address> --production` looks at the live site from outside (headers, sign in needed, no CORS, big requests refused, no test pages).
- [x] All tests, `pnpm audit`, and the same release on staging.

Done by the owner of the account (these need a login or a secret that only the owner has):

1. **Google sign in.** In Google Cloud Console, the OAuth client for production needs the redirect address exactly
   `https://ptv-lms.<account>.workers.dev/api/auth/google/callback`. Use a **new** client secret (the old one was shown in a chat and must be replaced), then
   `pnpm --filter @lms/api exec wrangler secret put GOOGLE_CLIENT_SECRET --env production`.
2. **Email (SMTP).** `wrangler secret put SMTP_USER --env production` and `wrangler secret put SMTP_PASS --env production` (for Gmail: the address and an app password).
3. **Bot check (Turnstile).** Cloudflare dashboard, Turnstile, add a widget for the production address. Then
   `wrangler secret put TURNSTILE_SECRET --env production`, and build the web app with the site key:
   `VITE_TURNSTILE_SITE_KEY=<site key> pnpm --filter @lms/web build`. In GitHub, set the repository variable `VITE_TURNSTILE_SITE_KEY`.
   Without it, sign in by an email link is hidden and only Google works (that is safe, only less convenient).
4. **Rate limiting rule.** Cloudflare dashboard, Security, WAF, Rate limiting rules: `/api/*`, 120 requests per minute per IP, action block for 1 minute.
   The app already limits sign in, sign up, invites and emails itself; this rule covers the rest.
5. **GitHub.** Environment `production` with a required reviewer, secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, variables `DEPLOY_ENABLED=true` and `PRODUCTION_URL`.
6. Run `bash scripts/smoke.sh https://ptv-lms.<account>.workers.dev --production` and `node scripts/preflight-production.mjs --secrets`. Both must pass.
7. Sign in once as the first teacher and try: create a course, add a student, invite, take attendance, make and send a receipt.

Secrets set with `wrangler secret put`, all with `--env production`:

| Secret                   | What for                                            | If it is lost                                |
| ------------------------ | --------------------------------------------------- | -------------------------------------------- |
| `HMAC_KEY`               | Hashes IP addresses and emails in counters and logs | Put a new one. Only the counters start again |
| `GOOGLE_CLIENT_SECRET`   | Lets the server ask Google who signed in            | Make a new one in Google Cloud Console       |
| `SMTP_USER`, `SMTP_PASS` | Sending email                                       | Make a new app password                      |
| `TURNSTILE_SECRET`       | Bot check on sign in by email link                  | Rotate in the dashboard                      |

## 2. Security review (September 2026)

What was checked, and the result. "Tests" means an automatic test that runs in every build.

| Area                                                            | Result                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in the repository and its history (about 1,100 commits) | None found. `.dev.vars` and `.env*` are ignored. Only the Google client id (public by design) is in the settings                                                                                                                                                                             |
| Dependencies                                                    | `pnpm audit`: no known vulnerabilities. Lockfile is used, GitHub Actions are pinned to a commit                                                                                                                                                                                              |
| Sign in                                                         | Google only by the authorization code way, with PKCE, `state` and `nonce`; the id token is checked for issuer, audience, expiry, nonce and verified email. A student gets in only with the exact email a teacher added. No passwords exist. Links are single use, 256 bits, stored as a hash |
| Sessions                                                        | Random 256 bit token, only its hash is stored, cookie `__Host-sid` (Secure, HttpOnly, SameSite=Lax), idle and absolute expiry, sign out everywhere                                                                                                                                           |
| CSRF                                                            | Three checks on every change: `Sec-Fetch-Site`, `Origin`, and a custom header. No CORS is allowed. Tests plus `smoke.sh`                                                                                                                                                                     |
| Who may see what                                                | Every route is listed with its role in `routes/access.ts` and a test walks the list. Every query is limited to the tenant of the signed in person; the database refuses rows that mix tenants (triggers); students only see their own work and courses. Tests, also with two teachers        |
| Injection                                                       | Only files in `repos/` may call the database, with bound values; the only text put into SQL is a short list of fixed names, checked by a test. Every input is checked with a schema                                                                                                          |
| XSS                                                             | No `v-html` or `innerHTML` anywhere. Strict page policy: no inline scripts or styles, `frame-ancestors 'none'`. Links written by people (lessons, materials, videos) are only `http(s)`, shown with their domain, opened with `noopener noreferrer`, and never fetched by the server         |
| Headers                                                         | HSTS, `nosniff`, referrer policy, permissions policy, COOP, CORP; API answers are `no-store`                                                                                                                                                                                                 |
| Denial of service                                               | New: a request bigger than 512 KB is refused before it is read (`413`). Sign in, invites and emails have counters. The Cloudflare rule in step 4 covers the rest                                                                                                                             |
| Test pages                                                      | The outbox of test emails and the local Google stand-in are refused outside a developer's computer; the API description is hidden in production. Tests plus `smoke.sh`                                                                                                                       |
| Errors                                                          | The user sees a short message and a request id; the detail (never a password or a link) goes to the log                                                                                                                                                                                      |
| Logs                                                            | Only messages about what failed; no email text, no password, no token                                                                                                                                                                                                                        |
| Sign in by email link                                           | New: hidden while the bot check is not set up (before, the form showed and always failed)                                                                                                                                                                                                    |

Found and fixed in this review: no size limit on requests; production settings without the hourly schedule (reminders,
repeating lessons and clean up would not have run) and with the test outbox for email; sign in by email link failing with an error
when the bot check is not set; sessions, sign in links and counters never removed.

Not a problem, but to know:

- The pages `/dev/google` and `/dev/outbox` exist in the web build (they are only screens). They do nothing without the local server, which refuses them.
- The id token from Google is not checked for its signature. This is allowed by OpenID Connect (Core 3.1.3.7) because it comes straight from Google over TLS in answer to our own request.
- No external penetration test was done. Do one before opening to many teachers.

## 3. Database review

- **Schema.** 20 migrations, applied in order (`0000` to `0019`), all backward compatible from now on: after `0019`, `preflight` refuses a migration that drops a table or a column.
- **Integrity.** On staging: every table passes `foreign_key_check` (no violations). Rows cannot mix tenants (triggers), the audit log and the score history can only grow (triggers), a sent receipt cannot change (trigger), and values have `CHECK` limits.
- **Speed.** The plans of the main queries were read with `EXPLAIN QUERY PLAN`: every one uses an index (lessons by time, attendance by student, receipts by month, grading queue, notifications, sessions by token hash, and more). The hourly reminder job used a full scan of the assignments; migration `0019` adds an index for it.
- **Growth.** Old rows are removed once an hour (`maintenance/jobs.ts`): sessions ended more than a week ago, sign in links older than 30 days (never the invites), counters of finished windows, emails of the test outbox older than a week, notifications older than 90 days. The audit log is kept.
- **Personal data.** No passwords. Emails, names and phone numbers of students and teachers, their attendance, work and scores, receipts and bank details of teachers (for the payment QR). Students cannot download their data (decision). Homework a teacher deletes is hidden but kept, because the score history can never be erased.
- **Limits of the free plan.** D1: 5 GB in all, 10 GB a database. Workers: 100,000 requests a day, 10 ms of CPU a request, 50 database queries a request. The code is written for these (one statement for a list, a job looks at 20 repeats at a time). Watch the dashboards (section 5).

### Backup and restore

- **Time Travel** keeps every change of the database for 30 days. Restore the whole database to a moment:
  `wrangler d1 time-travel info DB --env production` (shows the current restore point), then
  `wrangler d1 time-travel restore DB --env production --timestamp=<time>` or `--bookmark=<bookmark>`.
  The production workflow prints the restore point before every database change, so it is in the log of the run.
- **Export** (a copy you can keep): `wrangler d1 export DB --env production --remote --output backup.sql`. The file holds personal data:
  keep it private and encrypted, and delete it when it is not needed. Make one before every big change and once a month.
- **Test the restore once** on staging before you need it: note the restore point, change something, restore, check.

## 4. Releasing and going back

1. Everything goes to staging first (`develop`), then `bash scripts/smoke.sh <staging>`.
2. Production: run the workflow "LMS CI" by hand (`workflow_dispatch`); the reviewer approves. It runs the checks, `preflight --secrets`, prints the restore point, applies the migrations, deploys, and runs `smoke.sh --production`.
3. To go back: `wrangler rollback --env production` (the Worker). Migrations are backward compatible, so the old Worker still works. Data: Time Travel.
4. Rotating a secret: `wrangler secret put NAME --env production`. Rotate `GOOGLE_CLIENT_SECRET` and the SMTP password when someone who knew them leaves, or when one may have been shown.

## 5. Watching it

- **Cloudflare dashboard, Workers, ptv-lms:** requests, errors, CPU time. If CPU time gets near 10 ms or requests near 100,000 a day, move to Workers Paid (5 USD a month).
- **Logs** (Workers Logs, enabled): search for `"msg":"unhandled error"` (a bug; the request id is in the message the user saw), `deferred work failed` (an email that could not be sent; `smtp sign in failed (535)` is a wrong user or password), `scheduled job failed`, `google sign in failed`.
- **Alert:** in Notifications, add an alert for Workers error rate and one for the health check (`/api/health` must say `"database":"ok"`), sent to your email.
- **A weekly look:** the size of the database (`wrangler d1 info DB --env production`), and the audit log for surprises.

## 6. When something goes wrong

| What you see                            | Do this                                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nobody can sign in                      | Open `/api/auth/options`: if `google` is false, `GOOGLE_CLIENT_SECRET` is missing or wrong. Check the redirect address in Google Cloud Console                              |
| No emails arrive                        | Look for `deferred work failed` in the logs. Renew the app password. Gmail sends about 500 a day                                                                            |
| A bad release                           | `wrangler rollback --env production`                                                                                                                                        |
| Wrong data was written or deleted       | Time Travel restore to a moment before it (section 3)                                                                                                                       |
| Someone got access they should not have | Sign everybody out: `wrangler d1 execute DB --env production --remote --command "UPDATE sessions SET revoked_at = datetime('now')"`; rotate the secrets; read the audit log |
| A teacher asks to delete their data     | Not automatic yet. Export what is needed, then remove by hand; the audit log keeps only ids                                                                                 |

## 7. Known limits

- No external penetration test yet, no load test, and no automatic backup file (only Time Travel).
- Email goes through Gmail (about 500 a day, and the sender is that address). A domain and an email service give better delivery.
- One database for all teachers. Above about 5 GB, split it by group of teachers (every query is already limited to one tenant).
- Students cannot export or delete their own data; the teacher does it on request.
