import type { SQSHandler, SQSRecord } from "aws-lambda";
import { createWorkerContext } from "./context.js";
import type { GetEventIdParams, QueuePayload } from "../../application/types.js";
import {
  getOrderIdFromPayload,
  isMercadoLibreOrder,
  type MercadoLibreOrder,
} from "../../application/mercadolibre/types.js";

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

      const saved = await ctx.eventsRepository.saveEventIfNotExists({
        eventId,
        payload,
      });

      if (!saved) {
        console.log("Skipping duplicate event:", eventId);
        continue;
      }

      const orderId = getOrderIdFromPayload(payload);
      if (!orderId) {
        console.warn("Order ID not found in payload:", payload);
        continue;
      }

      const rawOrder = await ctx.mlApiClient.getOrder(orderId);

      if (!isMercadoLibreOrder(rawOrder)) {
        console.error("Invalid MercadoLibre order response", rawOrder);
        continue;
      }

      const order: MercadoLibreOrder = rawOrder;

      if (order.shipping?.status === "ready_to_ship") {
        const pdf = await ctx.mlApiClient.downloadShippingLabel(order.shipping.id);

        await ctx.telegram.sendDocument({
          filename: `label-${orderId}.pdf`,
          buffer: pdf,
          caption: `Etiqueta lista para envío`,
        });
      }

      await ctx.telegram.sendMessage(
        [
          `Nueva orden MercadoLibre`,
          `Order: ${orderId}`,
          "",
          `\`\`\`${JSON.stringify(order, null, 2)}\`\`\``,
        ].join("\n"),
      );
    } catch (error) {
      console.error("Worker failed processing record:", error);
      throw error; // TO-DO: SQS retry DLQ
    }
  }
};
