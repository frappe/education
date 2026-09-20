import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkConfig, parseJsonc } from "./preflight-production.mjs";

const good = () => ({
  d1_databases: [{ database_id: "00000000-0000-0000-0000-000000000000" }],
  env: {
    staging: {
      name: "app-staging",
      vars: { APP_URL: "https://app-staging.example.workers.dev" },
      d1_databases: [{ database_name: "db-staging", database_id: "11111111-1111-4111-8111-111111111111" }],
    },
    production: {
      name: "app",
      triggers: { crons: ["0 * * * *"] },
      vars: {
        ENVIRONMENT: "production",
        EMAIL_MODE: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "465",
        APP_URL: "https://app.example.workers.dev",
        GOOGLE_CLIENT_ID: "id",
      },
      d1_databases: [{ database_name: "db-production", database_id: "22222222-2222-4222-8222-222222222222" }],
    },
  },
});
const change = (edit) => {
  const c = good();
  edit(c.env.production, c);
  return checkConfig(c);
};
const has = (errors, part) =>
  assert.ok(
    errors.some((e) => e.includes(part)),
    `${part} not found in: ${errors.join(" | ")}`,
  );

test("good settings pass", () => assert.deepEqual(checkConfig(good()), []));

test("a placeholder database, or the database of staging, or of local, is refused", () => {
  has(
    change((p) => (p.d1_databases[0].database_id = "REPLACE_WITH_PRODUCTION_D1_ID")),
    "not a real id",
  );
  has(
    change((p, c) => (p.d1_databases[0].database_id = c.env.staging.d1_databases[0].database_id)),
    "database of staging",
  );
  has(
    change((p, c) => (p.d1_databases[0].database_id = c.d1_databases[0].database_id)),
    "placeholder database",
  );
  has(
    change((p) => (p.d1_databases[0].database_name = "db-staging")),
    "database name",
  );
  has(
    change((p) => (p.d1_databases = [])),
    "no D1 database",
  );
});

test("the test outbox, the local Google stand-in and a missing schedule are refused", () => {
  has(
    change((p) => (p.vars.EMAIL_MODE = "dev")),
    "EMAIL_MODE",
  );
  has(
    change((p) => (p.vars.GOOGLE_MODE = "dev")),
    "GOOGLE_MODE",
  );
  has(
    change((p) => delete p.triggers),
    "triggers.crons",
  );
  has(
    change((p) => (p.triggers = { crons: [] })),
    "triggers.crons",
  );
  has(
    change((p) => (p.vars.ENVIRONMENT = "staging")),
    "ENVIRONMENT",
  );
});

test("the address must be https, must not be staging's, and must not be a placeholder", () => {
  has(
    change((p) => (p.vars.APP_URL = "http://app.example.workers.dev")),
    "APP_URL",
  );
  has(
    change((p) => (p.vars.APP_URL = "https://app.example.workers.dev/path")),
    "APP_URL",
  );
  has(
    change((p, c) => (p.vars.APP_URL = c.env.staging.vars.APP_URL)),
    "address of staging",
  );
  has(
    change((p) => (p.vars.APP_URL = "REPLACE_WITH_PRODUCTION_URL")),
    "APP_URL",
  );
});

test("the Worker must have its own name, and preview addresses stay off", () => {
  has(
    change((p) => (p.name = "app-staging")),
    "name of the production Worker",
  );
  has(
    change((p) => (p.preview_urls = true)),
    "preview_urls",
  );
  assert.ok(checkConfig({ env: {} })[0].includes("no production environment"));
});

test("wrangler.jsonc is read with its comments and trailing commas, and a // inside a text is kept", () => {
  const parsed = parseJsonc('{\n // note\n "a": "https://x.example/y", /* more */ "b": [1, 2,],\n}');
  assert.deepEqual(parsed, { a: "https://x.example/y", b: [1, 2] });
  const real = parseJsonc(readFileSync(new URL("../apps/api/wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(real.env.production.vars.ENVIRONMENT, "production");
  assert.equal(real.env.production.vars.EMAIL_MODE, "smtp");
  assert.ok(real.env.production.triggers.crons.length > 0, "the real production settings have a schedule");
  assert.equal("GOOGLE_MODE" in real.env.production.vars, false);
  assert.equal("GOOGLE_MODE" in real.env.staging.vars, false);
});
