import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getOrderIdFromPayload,
  isMercadoLibreOrder,
  isMercadoLibreTokenResponse,
  isMercadoLibreShipment,
  isTokenExpired,
  mapMLOrderToOrderDTO,
  type MercadoLibreOrderWebhookPayload,
} from "../../../src/application/mercadolibre/types.js";

describe("isMercadoLibreTokenResponse", () => {
  it("accepts a valid token response", () => {
    expect(
      isMercadoLibreTokenResponse({
        access_token: "token",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    ).toBe(true);
  });

  it("rejects missing or invalid fields", () => {
    expect(isMercadoLibreTokenResponse(null)).toBe(false);
    expect(
      isMercadoLibreTokenResponse({
        access_token: "token",
        refresh_token: 123, // wrong type
        expires_in: 3600,
      }),
    ).toBe(false);
  });
});

describe("isMercadoLibreOrder", () => {
  it("accepts minimal valid order", () => {
    expect(
      isMercadoLibreOrder({
        id: 123,
        status: "paid",
      }),
    ).toBe(true);
  });

  it("accepts order with shipping", () => {
    expect(
      isMercadoLibreOrder({
        id: 123,
        status: "paid",
        shipping: {
          id: 999,
        },
      }),
    ).toBe(true);
  });

  it("rejects invalid shapes", () => {
    expect(
      isMercadoLibreOrder({
        id: "not-a-number",
        status: "paid",
      }),
    ).toBe(false);

    expect(
      isMercadoLibreOrder({
        id: 123,
        status: "paid",
        shipping: {
          id: "bad",
        },
      }),
    ).toBe(false);
  });
});

describe("mapMLOrderToOrderDTO", () => {
  it("maps minimal order", () => {
    const dto = mapMLOrderToOrderDTO({ id: 10, status: "paid" });
    expect(dto).toEqual({ id: 10, status: "paid" });
  });

  it("maps shipping fields when present", () => {
    const dto = mapMLOrderToOrderDTO({
      id: 11,
      status: "ready_to_ship",
      shipping: { id: 99 },
    });
    expect(dto).toEqual({
      id: 11,
      status: "ready_to_ship",
      shippingId: 99,
    });
  });
});

describe("isMercadoLibreShipment", () => {
  it("accepts valid shipment", () => {
    expect(
      isMercadoLibreShipment({
        id: 1,
        logistic_type: "fulfillment",
        status: "ready_to_ship",
        shipping_items: [{ quantity: 1, description: "item" }],
        receiver_address: {
          address_line: "Street 123",
          receiver_name: "John Doe",
          city: { name: "City" },
          state: { name: "State" },
        },
      }),
    ).toBe(true);
  });

  it("rejects invalid shipment", () => {
    expect(
      isMercadoLibreShipment({
        id: "1",
        logistic_type: "fulfillment",
        status: "ready_to_ship",
        shipping_items: [],
        receiver_address: {},
      }),
    ).toBe(false);

    expect(
      isMercadoLibreShipment({
        id: 1,
        status: "ready_to_ship",
        shipping_items: [{ quantity: 1, description: "item" }],
        receiver_address: {
          address_line: "Street 123",
          receiver_name: "John Doe",
          city: { name: "City" },
          state: { name: "State" },
        },
      }),
    ).toBe(false);

    expect(
      isMercadoLibreShipment({
        id: 1,
        logistic_type: 123,
        status: "ready_to_ship",
        shipping_items: [{ quantity: 1, description: "item" }],
        receiver_address: {
          address_line: "Street 123",
          receiver_name: "John Doe",
          city: { name: "City" },
          state: { name: "State" },
        },
      }),
    ).toBe(false);
  });
});

describe("getOrderIdFromPayload", () => {
  const basePayload: MercadoLibreOrderWebhookPayload = {
    _id: "id",
    topic: "orders_v2",
    resource: "/orders/2000014183891392",
    user_id: 1,
    application_id: 2,
    sent: "date",
    attempts: 1,
    received: "date",
    actions: [],
  };

  it("extracts the order id from resource", () => {
    expect(getOrderIdFromPayload(basePayload)).toBe("2000014183891392");
  });

  it("returns null when resource is missing or malformed", () => {
    expect(getOrderIdFromPayload({ ...basePayload, resource: undefined })).toBeNull();
    expect(getOrderIdFromPayload({ ...basePayload, resource: "/shipments/1" })).toBeNull();
  });
});

describe("isTokenExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("considers tokens expiring soon as expired", () => {
    vi.setSystemTime(1_000_000); // ms
    expect(
      isTokenExpired({
        accessToken: "a",
        refreshToken: "b",
        expiresAt: 1_020_000, // 20s ahead -> inside 60s buffer
      }),
    ).toBe(true);
  });

  it("keeps healthy tokens as valid", () => {
    vi.setSystemTime(1_000_000);
    expect(
      isTokenExpired({
        accessToken: "a",
        refreshToken: "b",
        expiresAt: 1_080_000, // 80s ahead -> outside 60s buffer
      }),
    ).toBe(false);
  });
});
