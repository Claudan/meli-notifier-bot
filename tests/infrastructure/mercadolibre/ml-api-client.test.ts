import { afterEach, describe, expect, it, vi } from "vitest";
import { createMLApiClient } from "../../../src/infrastructure/mercadolibre/ml-api-client.js";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("createMLApiClient", () => {
  const getAccessToken = vi.fn().mockResolvedValue("token-123");

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches order with bearer token and validates shape", async () => {
    const order = { id: 42, status: "paid" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(order));
    vi.stubGlobal("fetch", fetchMock);

    const client = createMLApiClient({ getAccessToken });
    const result = await client.getOrder("42");

    expect(getAccessToken).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("https://api.mercadolibre.com/orders/42", {
      headers: { Authorization: "Bearer token-123" },
    });
    expect(result).toEqual(order);
  });

  it("throws when response shape is invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: "bad", status: "paid" })));

    const client = createMLApiClient({ getAccessToken });

    await expect(client.getOrder("42")).rejects.toThrow("Invalid MercadoLibre order response");
  });

  it("returns a buffer when downloading shipping label", async () => {
    const pdf = Buffer.from("pdf-bytes");

    const arrayBuffer = () => Promise.resolve(pdf);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer,
      }),
    );

    const client = createMLApiClient({ getAccessToken });
    const result = await client.downloadShippingLabel(99);

    expect(result.equals(pdf)).toBe(true);
  });
});
