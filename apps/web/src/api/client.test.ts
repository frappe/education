import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./client";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Response | Error) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("api client", () => {
  it("does not send the client header on GET", async () => {
    const fetchFn = stubFetch(Response.json({ ok: 1 }));
    await api("/health");
    const init = fetchFn.mock.calls[0]![1]!;
    expect((init.headers as Record<string, string>)["x-lms-client"]).toBeUndefined();
  });

  it("sends the client header and idempotency key on writes", async () => {
    const fetchFn = stubFetch(Response.json({ ok: 1 }));
    await api("/things", { method: "POST", body: { a: 1 }, idempotencyKey: "k1" });
    const init = fetchFn.mock.calls[0]![1]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-lms-client"]).toBe("web");
    expect(headers["idempotency-key"]).toBe("k1");
    expect(init.body).toBe('{"a":1}');
  });

  it("turns an API error into ApiError with code and fields", async () => {
    stubFetch(
      Response.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Check the form",
            fields: { email: "Required" },
            requestId: "r1",
          },
        },
        { status: 400 },
      ),
    );
    const err = await api("/x", { method: "POST" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      code: "VALIDATION_FAILED",
      status: 400,
      fields: { email: "Required" },
      requestId: "r1",
    });
  });

  it("handles a network failure with a friendly message", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    const err = (await api("/x").catch((e) => e)) as ApiError;
    expect(err.code).toBe("NETWORK");
    expect(err.message).toMatch(/internet/i);
  });

  it("handles a non-JSON error body", async () => {
    stubFetch(new Response("<html>bad gateway</html>", { status: 502 }));
    const err = (await api("/x").catch((e) => e)) as ApiError;
    expect(err).toMatchObject({ code: "INTERNAL", status: 502 });
  });
});
