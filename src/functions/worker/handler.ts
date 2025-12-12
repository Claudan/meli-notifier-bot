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
      console.log("STEP 1 — SQS record received", {
        messageId: record.messageId,
        body: record.body,
      });

      const payload = parseRecordBody(record);
      const eventId = getEventId({ payload, record });

      console.log("STEP 2 — Parsed payload", { eventId, payload });

      const eventSaved = await ctx.eventsRepository.saveEventIfNotExists({
        eventId,
        payload,
      });

      if (!eventSaved) {
        console.log("STEP 2b — Duplicate event skipped", { eventId });
        continue;
      }

      const orderId = getOrderIdFromPayload(payload);
      if (!orderId) {
        console.log("STEP 3 — Order ID not found in payload", { payload });
        continue;
      }

      console.log("STEP 4 — Fetching order", { orderId });
      const order = await ctx.mlApiClient.getOrder(orderId);

      console.log("STEP 4b — Order summary", {
        id: order.id,
        status: order.status,
        shippingId: order.shipping?.id,
        buyer: order.buyer,
      });

      if (!order.shipping?.id) {
        console.log("STEP 5 — Order has no shipping", { orderId });
        continue;
      }

      const shipmentId = order.shipping.id;

      console.log("STEP 6 — Saving shipment event", { shipmentId });
      const shipmentSaved = await ctx.eventsRepository.saveEventIfNotExists({
        eventId: `shipment#${shipmentId}`,
        payload: {
          shipmentId,
          buyer: order.buyer,
        },
      });

      if (!shipmentSaved) {
        console.log("STEP 6b — Shipment already processed", { shipmentId });
        continue;
      }

      console.log("STEP 7 — Fetching shipment", { shipmentId });
      const shipment = await ctx.mlApiClient.getShipment(shipmentId);

      console.log("STEP 7b — Shipment summary", {
        id: shipment.id,
        status: shipment.status,
        itemsCount: shipment.shipping_items.length,
        city: shipment.receiver_address.city.name,
        logistic_type: shipment.logistic_type,
      });

      if (!["handling", "ready_to_ship"].includes(shipment.status)) {
        console.log("STEP 8 — Shipment not ready to ship", {
          shipmentId,
          status: shipment.status,
        });
        continue;
      }

      console.log("STEP 9 — Building Telegram message", { shipmentId });
      const message = getShipmentMessage({ order, shipment });

      console.log("STEP 10 — Sending Telegram message", {
        shipmentId,
        lines: message.split("\n").length,
      });

      await ctx.telegram.sendMessage(message);

      console.log("STEP 11 — Downloading PDF label", { shipmentId });
      const pdf = await ctx.mlApiClient.downloadShippingLabel(shipmentId);

      if (!pdf || pdf.length === 0) {
        console.error("STEP 11b — Empty PDF received", { shipmentId });
        continue;
      }

      console.log("STEP 11c — PDF downloaded", {
        shipmentId,
        size: pdf.length,
      });

      console.log("STEP 12 — Cropping PDF", { shipmentId });
      const cropped = await cropShippingLabel(pdf);

      console.log("STEP 13 — Sending cropped PDF to Telegram", {
        shipmentId,
        size: cropped.length,
      });

      await ctx.telegram.sendDocument({
        filename: `etiqueta-${shipmentId}.pdf`,
        buffer: cropped,
        caption: "Etiqueta de envío 📄",
      });

      console.log("STEP 14 — Shipment processed successfully", { shipmentId });
    } catch (error) {
      console.error("Worker failed processing record:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error; // TO-DO: SQS retry DLQ
    }
  }
};
