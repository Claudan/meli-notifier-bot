import type { SQSHandler, SQSRecord } from "aws-lambda";
import { sendTelegramMessage } from "../../libs/telegram.js";

type QueuePayload = Record<string, unknown>;

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

export const handler: SQSHandler = async (event) => {
  // Cloudwatch logs
  console.log(`Worker received ${event.Records.length} records`);
  for (const record of event.Records) {
    try {
      const payload = parseRecordBody(record);
      // TO-DO: implement meli and telegram logic
      console.log({ payload });
      // TO-DO: formatMessage()
      const message = `MercadoLibre Event:\n\`\`\`${JSON.stringify(payload, null, 2)}\`\`\``;
      await sendTelegramMessage(message);
    } catch (error: unknown) {
      console.error("Worker failed to process message:", error);
      throw error;
    }
  }
};
