import { describe, expect, it } from "vitest";
import { fetchAndParse } from "../../../src/infrastructure/http/fetch-and-parse.js";

const isPayload = (data: unknown): data is { foo: string } =>
  !!data && typeof data === "object" && typeof (data as Record<string, unknown>).foo === "string";

describe("fetchAndParse", () => {
  it("returns parsed JSON when guard passes", async () => {
    const res = new Response(JSON.stringify({ foo: "bar" }), {
      headers: { "Content-Type": "application/json" },
    });

    const parsed = await fetchAndParse(res, isPayload, "invalid");

    expect(parsed).toEqual({ foo: "bar" });
  });

  it("throws when guard rejects the payload", async () => {
    const res = new Response(JSON.stringify({ foo: 123 }), {
      headers: { "Content-Type": "application/json" },
    });

    await expect(fetchAndParse(res, isPayload, "invalid payload")).rejects.toThrow(
      "invalid payload",
    );
  });
});
