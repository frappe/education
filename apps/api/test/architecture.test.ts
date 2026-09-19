import { describe, expect, it } from "vitest";

// Vite adds import.meta.glob at test time; this tells TypeScript about it.
declare global {
  interface ImportMeta {
    glob(pattern: string, options: { query: string; import: string; eager: true }): Record<string, unknown>;
  }
}

// Every source file of the API, as text. (Works inside the Workers test runtime, which has no file system.)
const sources = import.meta.glob("../src/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const files = Object.entries(sources).map(([path, text]) => ({ path: path.replace("../src/", ""), text }));

/**
 * The only files that may talk to the database directly. Everything else goes through
 * `repos/`, where each query is scoped by tenant or user. Adding a file to this list is a
 * decision that should be reviewed, not a habit.
 */
const MAY_QUERY = [
  /^repos\//,
  /^audit\.ts$/,
  /^security\/rate-limit\.ts$/,
  /^email\/dev-provider\.ts$/,
  /^routes\/health\.ts$/,
  /^routes\/dev\.ts$/,
];

describe("data access rules", () => {
  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("only allowed modules call prepare() on the database", () => {
    const offenders = files
      .filter((f) => /\.prepare\(/.test(f.text))
      .filter((f) => !MAY_QUERY.some((rule) => rule.test(f.path)))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("never builds SQL by joining strings (only a few fixed, named pieces are allowed)", () => {
    // `${COLUMNS}`, `${where}` and `${ACTIVE_SEATS}` are constants written in the repos. `${placeholders(n)}` only
    // makes "?,?,?". No text from a request can reach these.
    const SAFE = /^(COLUMNS|where|ACTIVE_SEATS|placeholders\((chunk|ids)\.length\))$/;
    const offenders: string[] = [];
    for (const f of files) {
      for (const match of f.text.matchAll(/\.prepare\(\s*`([^`]*)`/g)) {
        for (const expr of match[1]!.matchAll(/\$\{([^}]*)\}/g)) {
          if (!SAFE.test(expr[1]!.trim())) offenders.push(`${f.path}: \${${expr[1]}}`);
        }
      }
      if (/\.prepare\(\s*("[^"]*"|'[^']*')\s*\+/.test(f.text)) offenders.push(`${f.path}: string +`);
    }
    expect(offenders).toEqual([]);
  });

  it("no route reads a tenant or user id from the request instead of the session", () => {
    // Routes take ids from the URL only for the thing being acted on (a student, a session),
    // and always pass the tenant that comes from the signed in actor.
    const routeFiles = files.filter((f) => f.path.startsWith("routes/") && f.path !== "routes/access.ts");
    const offenders = routeFiles
      .filter((f) =>
        /param\(["'](tenantId|userId)["']\)|query\(["'](tenantId|userId)["']\)|body\.(tenantId|userId)/.test(
          f.text,
        ),
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("does not log passwords, tokens or the session cookie", () => {
    const offenders = files
      .filter((f) => /console\.(log|error|warn|info)\([^)]*(password|token|cookie)/i.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
