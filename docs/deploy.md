# Deploy to Cloudflare

Everything runs on Cloudflare with the free `*.workers.dev` address. No custom domain is needed.
The **Workers Free** plan is enough for a small number of users. There are no passwords to hash and no Queues.
Limits to watch on Free: 10 ms of CPU time per request and 100,000 requests a day. After the first deploy, look at the CPU time in the
Workers dashboard. Move to Workers Paid (5 USD a month) if requests come close to 10 ms or the daily limit.

## One-time setup (needs a Cloudflare account)

```bash
cd apps/api
pnpm exec wrangler login

# 1. Create the databases and copy each database_id into wrangler.jsonc
pnpm exec wrangler d1 create ptv-lms-staging
pnpm exec wrangler d1 create ptv-lms-production
# replace REPLACE_WITH_STAGING_D1_ID and REPLACE_WITH_PRODUCTION_D1_ID

# 2. Apply the database migrations
pnpm exec wrangler d1 migrations apply DB --env staging --remote

# 3. Build the web app and deploy
pnpm --filter @lms/web build
pnpm exec wrangler deploy --env staging
```

The address is printed at the end, like `https://ptv-lms-staging.<your-account>.workers.dev`.

## Settings needed before real people can sign in

| Setting | Where | Why |
|---|---|---|
| `APP_URL` | `vars` in `apps/api/wrangler.jsonc` (per environment) | The address put in email links. Must start with `https://`. Never read from the request. |
| `HMAC_KEY` | `wrangler secret put HMAC_KEY --env <env>` (long random text) | Hashes emails and IP addresses in counters and logs. The app refuses to run without it. |
| `GOOGLE_CLIENT_ID` | `vars` in `apps/api/wrangler.jsonc` (per environment) | Turns on "Continue with Google". Without it (and the secret) the Google buttons are hidden and email links are the only way in. See "Sign in with Google" below. |
| `GOOGLE_CLIENT_SECRET` | `wrangler secret put GOOGLE_CLIENT_SECRET --env <env>` | Lets the server ask Google who signed in. |
| `TURNSTILE_SECRET` | `wrangler secret put TURNSTILE_SECRET --env <env>` | Bot check on the server. The app refuses to run without it in staging and production. |
| `VITE_TURNSTILE_SITE_KEY` | Set when building the web app (`VITE_TURNSTILE_SITE_KEY=... pnpm --filter @lms/web build`) | Shows the bot check on the forms. Create a Turnstile widget in the Cloudflare dashboard and allow the `workers.dev` address. |

## Sign in with Google

Students and teachers can sign in with one click, so nobody has to wait for an email each time. It is free.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (any name).
2. "APIs & Services", "OAuth consent screen": user type **External**. Fill the app name and your email. Scopes: only `openid`, `email` and `profile` (these need no Google review). Press **Publish app**, otherwise only listed test users can sign in.
3. "Credentials", "Create credentials", "OAuth client ID", type **Web application**. Under "Authorized redirect URIs" add **exactly** `https://<your address>/api/auth/google/callback` (one for staging, one for production). Nothing else.
4. Put the client id in `GOOGLE_CLIENT_ID` (`vars` of that environment in `wrangler.jsonc`) and the secret with `wrangler secret put GOOGLE_CLIENT_SECRET --env <env>`.

Who can get in does not change: a teacher creates their own account, and a student gets in **only with the exact email a teacher added and invited**. Locally, `GOOGLE_MODE=dev` (already set in `wrangler.jsonc`) shows a test page instead of Google; it is ignored on staging and production.
Not yet tried on a real `workers.dev` address: check that Google accepts it on the consent screen.

Email is still in dev mode (see `docs/spikes.md`). The dev outbox page is **not** available on staging or production
(it can sign people in), and `EMAIL_MODE=dev` is refused in production. On staging, read a link with:

```bash
pnpm exec wrangler d1 execute DB --env staging --remote --command \
  "SELECT to_email, kind, body_text FROM email_outbox ORDER BY created_at DESC LIMIT 5"
```

Also add a Cloudflare **rate limiting rule** for `/api/*` (for example 120 requests per minute per IP). The app limits
sensitive actions itself; this rule covers the rest.

## Automatic deploy from GitHub

1. In GitHub: Settings, Environments, create `staging` and `production`. Add **required reviewers** to `production`.
2. Add the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to each environment. Create the token with only the permissions it needs (Workers Scripts: Edit, D1: Edit).
3. Add the repository variable `DEPLOY_ENABLED` = `true`.

Pushes to `develop` deploy to staging. Production is a manual run of the workflow.

## Rules

- Database changes are **backward compatible** (add first, remove later), so rolling the Worker back never meets a schema it cannot read.
- Roll back a bad Worker with `wrangler rollback --env production`.
- Secrets are set with `wrangler secret put NAME --env <env>`. Never put them in the repository.
- Data can be restored from D1 Time Travel (30 days): `wrangler d1 time-travel restore`.
