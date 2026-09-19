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
