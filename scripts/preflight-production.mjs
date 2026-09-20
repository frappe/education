#!/usr/bin/env node
// Checks that the production settings are safe BEFORE anything is deployed. Run it from the repository root:
//   node scripts/preflight-production.mjs            settings in the repository and the web build
//   node scripts/preflight-production.mjs --secrets  also asks Cloudflare which secrets are set (needs `wrangler login`)
// It stops with a non-zero exit code when something is wrong, so the deploy workflow does not go on.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const notes = [];
const fail = (m) => problems.push(m);

/** Reads JSON with comments and trailing commas (wrangler.jsonc). */
export function parseJsonc(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === "\\") out += text[++i];
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else out += ch;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

/** The settings of the production environment: what must be true. Returns a list of problems. */
export function checkConfig(config) {
  const errors = [];
  const prod = config.env?.production;
  const staging = config.env?.staging;
  if (!prod) return ["There is no production environment in wrangler.jsonc."];
  const vars = prod.vars ?? {};
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  if (vars.ENVIRONMENT !== "production") errors.push('vars.ENVIRONMENT must be "production".');
  if (vars.EMAIL_MODE !== "smtp")
    errors.push('vars.EMAIL_MODE must be "smtp" (the outbox for tests is refused in production).');
  if (!vars.SMTP_HOST || !vars.SMTP_PORT) errors.push("vars.SMTP_HOST and vars.SMTP_PORT must be set.");
  if ("GOOGLE_MODE" in vars)
    errors.push("vars.GOOGLE_MODE (the local stand-in for Google) must not be set in production.");
  if (!/^https:\/\/[^/\s]+$/.test(String(vars.APP_URL ?? "")))
    errors.push("vars.APP_URL must be a https address with no path.");
  if (staging && vars.APP_URL === staging.vars?.APP_URL)
    errors.push("vars.APP_URL is the address of staging.");
  if (!vars.GOOGLE_CLIENT_ID)
    errors.push("vars.GOOGLE_CLIENT_ID is not set (the only way to sign in without a bot check).");
  if (!prod.triggers?.crons?.length) {
    errors.push("triggers.crons is missing: reminders, repeating lessons and the clean up would never run.");
  }
  if (!prod.name || prod.name === staging?.name)
    errors.push("The name of the production Worker must be its own.");

  const db = prod.d1_databases?.[0];
  if (!db) errors.push("There is no D1 database for production.");
  else {
    if (!uuid.test(String(db.database_id)))
      errors.push(
        "d1_databases[0].database_id is not a real id yet (run `wrangler d1 create ptv-lms-production`).",
      );
    if (db.database_id === staging?.d1_databases?.[0]?.database_id)
      errors.push("Production uses the database of staging.");
    if (db.database_id === config.d1_databases?.[0]?.database_id)
      errors.push("Production uses the placeholder database.");
    if (db.database_name === staging?.d1_databases?.[0]?.database_name)
      errors.push("The database name of production is the one of staging.");
  }
  for (const [where, value] of Object.entries({ ...vars, name: prod.name })) {
    if (typeof value === "string" && /REPLACE_WITH|CHANGE_ME|TODO/i.test(value))
      errors.push(`${where} still has a placeholder: ${value}`);
  }
  // Settings that are not inherited by an environment: the safe values must be written there.
  for (const key of ["workers_dev", "preview_urls"]) {
    if (prod[key] === true && key === "preview_urls")
      errors.push("preview_urls must be off (they would be more addresses to the same database).");
  }
  return errors;
}

/** The web build must exist and must not ship source maps or a key of any kind. */
function checkBuild() {
  const dist = path.join(root, "apps/web/dist");
  if (!existsSync(dist)) return ["The web app is not built (run `pnpm --filter @lms/web build`)."];
  const errors = [];
  const walk = (dir) =>
    readdirSync(dir).flatMap((n) =>
      statSync(path.join(dir, n)).isDirectory() ? walk(path.join(dir, n)) : [path.join(dir, n)],
    );
  const files = walk(dist);
  if (files.some((f) => f.endsWith(".map"))) errors.push("The web build has source maps.");
  if (!existsSync(path.join(dist, "index.html"))) errors.push("The web build has no index.html.");
  const text = files
    .filter((f) => /\.(js|html|css)$/.test(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  if (/GOCSPX-|-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}/.test(text))
    errors.push("The web build contains something that looks like a secret.");
  if (!/challenges\.cloudflare\.com/.test(readFileSync(path.join(dist, "_headers"), "utf8")))
    notes.push("_headers does not mention Turnstile (fine if the bot check is not used).");
  if (!/sitekey|0x4[A-Za-z0-9_-]{18,}/.test(text))
    notes.push("The web build has no Turnstile site key: sign in by an email link is hidden (Google only).");
  return errors;
}

/** Migrations up to this number were written before the first production release; they only replay on an empty database. */
const BASELINE = 19;

/** The migrations are numbered one after the other. After the baseline, none may drop a table or a column. */
function checkMigrations() {
  const dir = path.join(root, "apps/api/migrations");
  const names = readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .sort();
  const errors = [];
  names.forEach((n, i) => {
    const want = String(i).padStart(4, "0");
    if (!n.startsWith(`${want}_`)) errors.push(`Migration ${n} is out of order (expected ${want}_...).`);
    const sql = readFileSync(path.join(dir, n), "utf8");
    if (i > BASELINE && /\bDROP\s+(TABLE|COLUMN)\b/i.test(sql.replace(/--.*$/gm, ""))) {
      errors.push(`Migration ${n} drops a table or a column. Database changes must be backward compatible.`);
    }
  });
  notes.push(`${names.length} migrations.`);
  return errors;
}

function checkSecrets(config) {
  const need = ["HMAC_KEY", "TURNSTILE_SECRET", "SMTP_USER", "SMTP_PASS", "GOOGLE_CLIENT_SECRET"];
  let listed;
  try {
    listed = JSON.parse(
      execFileSync(
        "pnpm",
        [
          "--filter",
          "@lms/api",
          "exec",
          "wrangler",
          "secret",
          "list",
          "--env",
          "production",
          "--format",
          "json",
        ],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ),
    ).map((s) => s.name);
  } catch {
    return [
      "Could not read the secrets of production (is `wrangler login` done, and does the Worker exist?).",
    ];
  }
  return need
    .filter((n) => !listed.includes(n))
    .map((n) => `The secret ${n} is not set in production (wrangler secret put ${n} --env production).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = parseJsonc(readFileSync(path.join(root, "apps/api/wrangler.jsonc"), "utf8"));
  problems.push(...checkConfig(config), ...checkBuild(), ...checkMigrations());
  if (process.argv.includes("--secrets")) problems.push(...checkSecrets(config));
  for (const n of notes) console.log(`note: ${n}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s) before production:`);
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log("Production settings look right.");
}
