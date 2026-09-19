# LMS

A simple classroom system for freelance teachers and their students: courses, lessons, attendance,
homework and scoring, notes, and monthly invoices. Runs fully on Cloudflare.

- Product vision: [docs/pvd.md](docs/pvd.md)
- Architecture: [docs/sad.md](docs/sad.md)
- **Delivery plan (logic, UX, security, milestones): [docs/plan.md](docs/plan.md)**
- Threat model: [docs/threat-model.md](docs/threat-model.md)
- Screen behavior specs: [docs/screen-specs.md](docs/screen-specs.md)
- Technical spikes: [docs/spikes.md](docs/spikes.md)
- Deploying: [docs/deploy.md](docs/deploy.md)

## Layout

| Folder | What is in it |
|---|---|
| `apps/api` | Cloudflare Worker: Hono API, D1 database migrations, tests |
| `apps/web` | Vue 3 web app. `features/` holds logic, `ui/` is the only place that knows how things look |
| `packages/shared` | Error codes, permission matrix, glossary, fixed values shared by API and web |

The previous Frappe Education code is kept in the git tag `legacy-frappe-education`
and the branch `legacy/frappe`.

## Develop

Needs Node 22 or newer. pnpm comes from corepack.

```bash
corepack enable
pnpm install
pnpm --filter @lms/api db:migrate:local   # create the local database
pnpm dev                                  # builds the web app, then runs the Worker on :8787
pnpm dev:web                              # optional: Vite dev server with hot reload (proxies /api)
```

Open http://localhost:8787. Emails are not sent. Read them (with the confirm and sign in links) at
http://localhost:8787/dev/outbox, which only works on your own computer.

Locally there is no client address, so all requests count as one address. If you get locked out while testing
(5 wrong passwords), clear the counters:
`pnpm --filter @lms/api exec wrangler d1 execute DB --local --command "DELETE FROM rate_limits"`.

```bash
pnpm test        # API tests run inside the Workers runtime
pnpm typecheck
pnpm lint
pnpm build
```
