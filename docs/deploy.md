# Deploy to Cloudflare

Everything runs on Cloudflare with the free `*.workers.dev` address. No custom domain is needed.
The **Workers Paid** plan is required (password hashing CPU time, Queues, Browser Rendering).

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
| `TURNSTILE_SECRET` | `wrangler secret put TURNSTILE_SECRET --env <env>` | Bot check on the server. The app refuses to run without it in staging and production. |
| `VITE_TURNSTILE_SITE_KEY` | Set when building the web app (`VITE_TURNSTILE_SITE_KEY=... pnpm --filter @lms/web build`) | Shows the bot check on the forms. Create a Turnstile widget in the Cloudflare dashboard and allow the `workers.dev` address. |

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
