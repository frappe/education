/** Fills {name} places in a message: fill("{n} students", { n: 3 }) gives "3 students". */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
