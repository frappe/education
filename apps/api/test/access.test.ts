import { describe, expect, it } from "vitest";
import { ROUTE_ACCESS } from "../src/routes/access";
import { app, call, createStudent, createTeacher } from "./helpers";

const registered = app.routes
  .filter((r) => r.method !== "ALL" && r.path.startsWith("/api"))
  .map((r) => `${r.method} ${r.path}`);

const asPath = (key: string) => key.split(" ")[1]!.replace(/:\w+/g, "x");
const methodOf = (key: string) => key.split(" ")[0]!;

describe("route access table", () => {
  it("lists every route the app has, and nothing else", () => {
    expect([...new Set(registered)].sort()).toEqual(Object.keys(ROUTE_ACCESS).sort());
  });

  const protectedRoutes = Object.entries(ROUTE_ACCESS).filter(([, a]) => a !== "public");

  it("has protected routes to check", () => {
    expect(protectedRoutes.length).toBeGreaterThan(5);
  });

  for (const [key, access] of protectedRoutes) {
    it(`${key} (${access}): not signed in gets 401, before any input is read`, async () => {
      const res = await call(asPath(key), { method: methodOf(key) }); // no body on purpose
      expect(res.status).toBe(401);
    });
  }

  for (const [key] of protectedRoutes.filter(([, a]) => a === "teacher")) {
    it(`${key} (teacher): a student gets 403`, async () => {
      const teacher = await createTeacher();
      const student = await createStudent(teacher);
      const res = await call(asPath(key), { method: methodOf(key), cookie: student.cookie });
      expect(res.status).toBe(403);
    });
  }
});
