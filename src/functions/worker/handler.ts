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

  console.log("Worker start", { records: event.Records.length });

  for (const record of event.Records) {
    try {
      console.log("SQS record received", {
        messageId: record.messageId,
        body: record.body,
      });

      const payload = parseRecordBody(record);
      const eventId = getEventId({ payload, record });

      console.log("Parsed payload", { eventId });

      const eventSaved = await ctx.eventsRepository.saveEventIfNotExists({
        eventId,
        payload,
      });

      if (!eventSaved) {
        console.log("Duplicate event skipped", { eventId });
        continue;
      }

      const orderId = getOrderIdFromPayload(payload);
      if (!orderId) {
        console.log("Order ID not found in payload", { payload });
        continue;
      }

      console.log("Fetching order", { orderId });
      const order = await ctx.mlApiClient.getOrder(orderId);

      console.log("Order summary", {
        id: order.id,
        status: order.status,
        shippingId: order.shipping?.id,
        buyer: order.buyer,
      });

      if (!order.shipping?.id) {
        console.log("Order has no shipping", { orderId });
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
        console.log("Shipment already processed", { shipmentId });
        continue;
      }

      console.log("Fetching shipment", { shipmentId });
      const shipment = await ctx.mlApiClient.getShipment(shipmentId);

      console.log("Shipment summary", {
        id: shipment.id,
        status: shipment.status,
        itemsCount: shipment.shipping_items.length,
        city: shipment.receiver_address.city.name,
      });

      if (!["handling", "ready_to_ship"].includes(shipment.status)) {
        console.log("Shipment not ready to ship", {
          shipmentId,
          status: shipment.status,
        });
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

      console.log("Sending Telegram message", {
        shipmentId,
        lines: message.split("\n").length,
      });

      await ctx.telegram.sendMessage(message);

      const pdf = await ctx.mlApiClient.downloadShippingLabel(shipmentId);

      console.log("Shipping label downloaded", {
        shipmentId,
        size: pdf.length,
      });

      await ctx.telegram.sendDocument({
        filename: `etiqueta-${shipmentId}.pdf`,
        buffer: pdf,
        caption: "Etiqueta de envío 📄",
      });

      console.log("Shipment processed successfully", { shipmentId });
    } catch (error) {
      console.log("Worker failed processing record:", error);
      throw error; // TO-DO: SQS retry DLQ
    }
  }
};
