import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@/api/client";
import { useForm } from "./useForm";

const schema = z.object({ email: z.email("Bad email"), name: z.string().min(1, "Name needed") });

describe("useForm", () => {
  it("shows our own field errors and does not call the server", async () => {
    let calls = 0;
    const form = useForm({ email: "nope", name: "" }, { schema, submit: async () => void calls++ });
    await form.submit();
    expect(form.errors.value).toEqual({ email: "Bad email", name: "Name needed" });
    expect(calls).toBe(0);
  });

  it("calls submit with the values when they are fine", async () => {
    let got: unknown;
    const form = useForm({ email: "a@b.co", name: "A" }, { schema, submit: async (v) => void (got = v) });
    await form.submit();
    expect(got).toEqual({ email: "a@b.co", name: "A" });
    expect(form.errors.value).toEqual({});
  });

  it("puts server field errors next to the fields and keeps what was typed", async () => {
    const form = useForm(
      { email: "a@b.co", name: "A" },
      {
        submit: async () => {
          throw new ApiError("VALIDATION_FAILED", "Check the form", 400, { email: "Already used" });
        },
      },
    );
    await form.submit();
    expect(form.errors.value).toEqual({ email: "Already used" });
    expect(form.formError.value).toBeNull();
    expect(form.values.email).toBe("a@b.co");
  });

  it("shows a general server error when there is no field", async () => {
    const form = useForm(
      { email: "a@b.co" },
      {
        submit: async () => {
          throw new ApiError("INVALID_CREDENTIALS", "The email or password is not correct.", 401);
        },
      },
    );
    await form.submit();
    expect(form.formError.value).toBe("The email or password is not correct.");
  });

  it("never sends twice at the same time", async () => {
    let calls = 0;
    let release!: () => void;
    const form = useForm(
      { a: "1" },
      {
        submit: () => {
          calls++;
          return new Promise<void>((r) => (release = r));
        },
      },
    );
    const first = form.submit();
    await form.submit(); // second click while the first is running
    release();
    await first;
    expect(calls).toBe(1);
    expect(form.submitting.value).toBe(false);
  });

  it("gives a friendly message for an unexpected error", async () => {
    const form = useForm(
      { a: "1" },
      {
        submit: async () => {
          throw new Error("boom internals");
        },
      },
    );
    await form.submit();
    expect(form.formError.value).not.toContain("boom");
  });
});
