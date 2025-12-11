import type { MercadoLibreOrder, MercadoLibreShipment } from "../types.js";

interface GetShipmentMessageParams {
  order: MercadoLibreOrder;
  shipment: MercadoLibreShipment;
}

export function getShipmentMessage({ order, shipment }: GetShipmentMessageParams): string {
  const buyer = order.buyer ?? {};

  const fullName = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ").trim();

  const buyerName =
    fullName && buyer.nickname
      ? `${fullName} (${buyer.nickname})`
      : fullName || buyer.nickname || "Cliente";

  const address = shipment.receiver_address ?? {
    address_line: "Dirección no disponible",
    receiver_name: buyerName,
    city: { name: "" },
    state: { name: "" },
  };

  const logisticMessage =
    shipment.logistic_type === "fulfillment"
      ? "MercadoLibre ha enviado desde Full"
      : "Debes preparar el siguiente pedido";

  return [
    logisticMessage,
    "",
    `Cliente: ${buyerName}`,
    `Recibe: ${address.receiver_name}`,
    "",
    `Dirección: ${address.address_line}`,
    `${address.city?.name ?? ""}, ${address.state?.name ?? ""}`,
    "",
    "Productos:",
    ...shipment.shipping_items.map(({ description, quantity }) => `• ${quantity}× ${description}`),
  ]
    .filter(Boolean)
    .join("\n");
}
