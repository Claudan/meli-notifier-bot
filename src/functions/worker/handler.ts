import type { SQSHandler, SQSRecord } from "aws-lambda";
import { sendTelegramMessage } from "../../infrastructure/telegram/telegram-client.js";
import { saveEventIfNotExists } from "../../infrastructure/dynamo/events-repository.js";
import { ENV } from "../../utils/env.js";
import type { GetEventIdParams, QueuePayload } from "../../application/types.js";

const { DYNAMO_TABLE } = ENV;

const parseRecordBody = (record: SQSRecord): QueuePayload => {
  const { body } = record;
  if (!body) return {};
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as QueuePayload;
    }
    return {};
  } catch {
    console.warn("Invalid JSON in SQS record body:", body);
    return {};
  }
};

export const getEventId = ({ payload, record }: GetEventIdParams): string => {
  if (typeof payload?.id === "string") return payload.id;
  if (typeof payload?.id === "number") return String(payload.id);
  return record.messageId ?? crypto.randomUUID();
};

export const handler: SQSHandler = async (event) => {
  // Cloudwatch logs
  console.log(`Worker received ${event.Records.length} records`);
  for (const record of event.Records) {
    try {
      const payload = parseRecordBody(record);
      console.log({ payload });
      const eventId = getEventId({ payload, record });
      const saved = await saveEventIfNotExists({ tableName: DYNAMO_TABLE, eventId, payload });
      if (!saved) {
        console.log("Skipping duplicate event:", eventId);
        continue;
      }
      // TO-DO: formatMessage()
      const message = `MercadoLibre Event:\n\`\`\`${JSON.stringify(payload, null, 2)}\`\`\``;
      await sendTelegramMessage(message);
    } catch (error: unknown) {
      console.error("Worker failed to process message:", error);
      throw error;
    }
  }
};
