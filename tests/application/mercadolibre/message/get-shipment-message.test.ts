import { describe, expect, it } from "vitest";
import { getShipmentMessage } from "../../../../src/application/mercadolibre/message/get-shipment-message.js";
import type {
  MercadoLibreOrder,
  MercadoLibreShipment,
} from "../../../../src/application/mercadolibre/types.js";

describe("getShipmentMessage", () => {
  it("builds a fulfillment message including full buyer name and nickname", () => {
    const order: MercadoLibreOrder = {
      id: 1,
      status: "paid",
      buyer: { first_name: "Ana", last_name: "Perez", nickname: "anita" },
    };

    const shipment: MercadoLibreShipment = {
      id: 10,
      logistic_type: "fulfillment",
      status: "handling",
      shipping_items: [
        { quantity: 2, description: "Producto A" },
        { quantity: 1, description: "Producto B" },
      ],
      receiver_address: {
        address_line: "Calle 123",
        receiver_name: "Ana Perez",
        city: { name: "CDMX" },
        state: { name: "CDMX" },
      },
    };

    expect(getShipmentMessage({ order, shipment })).toBe(
      [
        "MercadoLibre ha enviado desde Full",
        "Cliente: Ana Perez (anita)",
        "Recibe: Ana Perez",
        "Dirección: Calle 123",
        "CDMX, CDMX",
        "Productos:",
        "• 2× Producto A",
        "• 1× Producto B",
      ].join("\n"),
    );
  });

  it("builds a prepare message with fallback buyer label when not fulfillment", () => {
    const order: MercadoLibreOrder = {
      id: 2,
      status: "paid",
      buyer: {},
    };

    const shipment: MercadoLibreShipment = {
      id: 20,
      logistic_type: "xd_drop_off",
      status: "ready_to_ship",
      shipping_items: [{ quantity: 1, description: "Widget" }],
      receiver_address: {
        address_line: "Calle Falsa 123",
        receiver_name: "Destinatario",
        city: { name: "Springfield" },
        state: { name: "State" },
      },
    };

    expect(getShipmentMessage({ order, shipment })).toBe(
      [
        "Debes preparar el siguiente pedido",
        "Cliente: Cliente",
        "Recibe: Destinatario",
        "Dirección: Calle Falsa 123",
        "Springfield, State",
        "Productos:",
        "• 1× Widget",
      ].join("\n"),
    );
  });
});
