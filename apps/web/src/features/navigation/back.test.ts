import { describe, expect, it } from "vitest";
import { previousPath } from "./back";

describe("the screen before this one", () => {
  it("is the path the person came from inside the app", () => {
    expect(previousPath({ back: "/schedule?week=2026-09-14" })).toBe("/schedule?week=2026-09-14");
    expect(previousPath({ back: "/courses/c_1?tab=lessons" })).toBe("/courses/c_1?tab=lessons");
    expect(previousPath({ back: "/", forward: null })).toBe("/");
  });

  it("is nothing when the person came from outside: a new tab, a link, a reload of the first screen", () => {
    expect(previousPath(null)).toBeNull();
    expect(previousPath({})).toBeNull();
    expect(previousPath({ back: null })).toBeNull();
    expect(previousPath({ back: "https://example.com/" })).toBeNull();
    expect(previousPath("/schedule")).toBeNull();
  });

  it("is nothing when the screen before was a form or a sign in screen, so back does not open an old form", () => {
    for (const path of [
      "/courses/new",
      "/invoices/new",
      "/students/import",
      "/assignments/a_1/edit",
      "/courses/c_1/homework/new",
      "/courses/new?x=1",
      "/sign-in",
      "/sign-up",
      "/accept-invite?token=x",
      "/magic-link",
      "/verify-email",
    ]) {
      expect(previousPath({ back: path }), path).toBeNull();
    }
    // A screen that only has "new" or "edit" inside a longer word is a normal screen.
    expect(previousPath({ back: "/courses/renew" })).toBe("/courses/renew");
    expect(previousPath({ back: "/students/edited-name" })).toBe("/students/edited-name");
  });
});
