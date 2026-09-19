import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = import.meta.dirname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

const importsOf = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!);

describe("frontend architecture (plan 5.2)", () => {
  it("features/ never imports ui/, pages/ or .vue files", () => {
    const bad = files(path.join(root, "features")).flatMap((f) =>
      importsOf(f)
        .filter((i) => /(^|\/)(ui|pages)(\/|$)/.test(i) || i.endsWith(".vue"))
        .map((i) => `${path.relative(root, f)} -> ${i}`),
    );
    expect(bad).toEqual([]);
  });

  it("pages/ and components/ do not use raw color values, only design tokens", () => {
    const bad = [...files(path.join(root, "pages")), ...files(path.join(root, "components"))]
      .filter((f) => f.endsWith(".vue"))
      .filter((f) => /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f));
    expect(bad).toEqual([]);
  });

  it("pages and components do not hard-code text: they read from the message catalog", () => {
    const bad = [...files(path.join(root, "pages")), ...files(path.join(root, "components"))]
      .filter((f) => f.endsWith(".vue"))
      .filter((f) =>
        />\s*[A-Z][a-z]+ [a-z]+[^<{]*</.test(
          readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/, ""),
        ),
      )
      .map((f) => path.relative(root, f));
    expect(bad).toEqual([]);
  });
});
