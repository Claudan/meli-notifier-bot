import type { SQSHandler, SQSRecord } from "aws-lambda";
import { createWorkerContext } from "./context.js";
import { cropShippingLabel } from "../../application/mercadolibre/label/crop-shipping-label.js";
import { getShipmentMessage } from "../../application/mercadolibre/message/get-shipment-message.js";
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
      const payload = parseRecordBody(record);
      const eventId = getEventId({ payload, record });

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
        console.log("OrderId not found in payload", { payload });
        continue;
      }

      const order = await ctx.mlApiClient.getOrder(orderId);

      console.log("Order summary", {
        id: order.id,
        status: order.status,
        shippingId: order.shipping?.id,
      });

      if (!order.shipping?.id) {
        console.log("Order has no shipping", { orderId });
        continue;
      }

      const shipmentId = order.shipping.id;

      console.log("Saving shipment event", { shipmentId });
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

      const shipment = await ctx.mlApiClient.getShipment(shipmentId);

      console.log("Processing shipment", {
        id: shipmentId,
        status: shipment.status,
        logistic_type: shipment.logistic_type,
      });

      if (!["handling", "ready_to_ship"].includes(shipment.status)) {
        console.log("Shipment not ready to ship", {
          shipmentId,
          status: shipment.status,
        });
        continue;
      }

      const message = getShipmentMessage({ order, shipment });

      await ctx.telegram.sendMessage(message);
      console.log("Telegram message sent", { shipmentId });

      const pdf = await ctx.mlApiClient.downloadShippingLabel(shipmentId);

      if (!pdf || pdf.length === 0) {
        console.error("Empty PDF received", { shipmentId });
        continue;
      }

      const cropped = await cropShippingLabel(pdf);

      console.log("Shipping label sent", {
        shipmentId,
        size: cropped.length,
      });

      await ctx.telegram.sendDocument({
        filename: `etiqueta-${shipmentId}.pdf`,
        buffer: cropped,
        caption: "Etiqueta de envío 📄",
      });

      console.log("Shipment processed successfully", { shipmentId });
    } catch (error) {
      console.error("Worker failed processing record:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error; // TO-DO: SQS retry DLQ
    }
  }
};
