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

  it("every App component that a screen uses is imported (a missing import shows as an empty gap, not as an error)", () => {
    const bad = files(root)
      .filter((f) => f.endsWith(".vue"))
      .flatMap((f) => {
        const text = readFileSync(f, "utf8");
        const script = /<script[\s\S]*?<\/script>/.exec(text)?.[0] ?? "";
        const template = text.replace(/<script[\s\S]*?<\/script>/, "");
        const self = path.basename(f, ".vue");
        return [...new Set([...template.matchAll(/<(App[A-Z][A-Za-z]*)[\s>/]/g)].map((m) => m[1]!))]
          .filter((name) => name !== self && !new RegExp(`import ${name}(,| from)`).test(script))
          .map((name) => `${path.relative(root, f)}: ${name}`);
      });
    expect(bad).toEqual([]);
  });

  it("in the buttons at the top of a page, the main button is always the last one (the far right)", () => {
    const bad = files(path.join(root, "pages"))
      .filter((f) => f.endsWith(".vue"))
      .flatMap((f) => {
        const template = readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/, "");
        // The buttons of the page itself: a slot named "actions" that is a direct child of the page (four spaces in).
        const blocks = [...template.matchAll(/\n {4}<template[^>]*#actions>([\s\S]*?)\n {4}<\/template>/g)];
        return blocks.flatMap((m) => {
          const controls = [...m[1]!.matchAll(/<(AppButton|RouterLink|button)\b[^>]*>/g)];
          const isMain = (tag: string) =>
            tag.startsWith("<AppButton") ? !/variant/.test(tag) : /btn-primary/.test(tag);
          const last = controls.at(-1);
          const hasMain = controls.some((c) => isMain(c[0]));
          return hasMain && last && !isMain(last[0]) ? [`${path.relative(root, f)}: ${last[0]}`] : [];
        });
      });
    expect(bad).toEqual([]);
  });

  it("no screen uses an inline style (the page security policy blocks them): use classes", () => {
    const bad = files(root)
      .filter((f) => f.endsWith(".vue"))
      .filter((f) => /\sstyle="/.test(readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/, "")))
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
