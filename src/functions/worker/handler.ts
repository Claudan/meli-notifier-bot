import type { SQSHandler, SQSRecord } from "aws-lambda";
import { createWorkerContext } from "./context.js";
import type { GetEventIdParams, QueuePayload } from "../../application/types.js";
import { getOrderIdFromPayload } from "../../application/mercadolibre/types.js";

const parseRecordBody = (record: SQSRecord): QueuePayload => {
  if (!record.body) return {};

  try {
    const parsed = JSON.parse(record.body) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as QueuePayload)
      : {};
  } catch {
    console.warn("Invalid JSON in SQS record body:", record.body);
    return {};
  }
};

const getEventId = ({ payload, record }: GetEventIdParams): string => {
  if (typeof payload?.id === "string") return payload.id;
  if (typeof payload?.id === "number") return String(payload.id);
  return record.messageId ?? crypto.randomUUID();
};

export const handler: SQSHandler = async (event) => {
  const ctx = await createWorkerContext();

  console.log(`Worker received ${event.Records.length} records`);

  for (const record of event.Records) {
    try {
      const payload = parseRecordBody(record);
      const eventId = getEventId({ payload, record });

      const eventSaved = await ctx.eventsRepository.saveEventIfNotExists({
        eventId,
        payload,
      });

      if (!eventSaved) {
        console.log("Skipping duplicate event:", eventId);
        continue;
      }

      const orderId = getOrderIdFromPayload(payload);
      if (!orderId) {
        console.warn("Order ID not found in payload:", payload);
        continue;
      }

      const order = await ctx.mlApiClient.getOrder(orderId);

      if (!order.shipping?.id) {
        console.log("Order without shipping:", order.id);
        continue;
      }

      const shipmentId = order.shipping.id;
      const shipmentSaved = await ctx.eventsRepository.saveEventIfNotExists({
        eventId: `shipment#${shipmentId}`,
        payload: {
          shipmentId,
          buyer: order.buyer,
        },
      });

      if (!shipmentSaved) {
        console.log("Shipment already processed:", shipmentId);
        continue;
      }

      const shipment = await ctx.mlApiClient.getShipment(shipmentId);

      if (shipment.status !== "ready_to_ship") {
        continue;
      }

      const buyerName =
        order.buyer?.first_name || order.buyer?.last_name
          ? `${order.buyer.first_name ?? ""} ${order.buyer.last_name ?? ""}`.trim()
          : (order.buyer?.nickname ?? "Cliente");

      const message = [
        "Envío listo para despachar",
        "",
        `Cliente: ${buyerName}`,
        shipment.receiver_address.receiver_name !== buyerName
          ? `Recibe: ${shipment.receiver_address.receiver_name}`
          : null,
        "",
        `Dirección: ${shipment.receiver_address.address_line}`,
        `${shipment.receiver_address.city.name}, ${shipment.receiver_address.state.name}`,
        "",
        "Productos:",
        ...shipment.shipping_items.map((item) => `• ${item.quantity}× ${item.description}`),
      ]
        .filter(Boolean)
        .join("\n");

      const pdf = await ctx.mlApiClient.downloadShippingLabel(shipmentId);

      await ctx.telegram.sendMessage(message);
      await ctx.telegram.sendDocument({
        filename: `etiqueta-${shipmentId}.pdf`,
        buffer: pdf,
        caption: "Etiqueta de envío 📄",
      });
    } catch (error) {
      console.error("Worker failed processing record:", error);
      throw error; // TO-DO: SQS retry DLQ
    }
  }
};
