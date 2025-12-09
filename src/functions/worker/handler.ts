import type { SQSHandler, SQSRecord } from "aws-lambda";
import { createTelegramClient } from "../../infrastructure/telegram/telegram-client.js";
import { createDynamoClient } from "../../infrastructure/dynamo/dynamo-client.js";
import { createEventsRepository } from "../../infrastructure/dynamo/events-repository.js";
import { createMLTokenRepository } from "../../infrastructure/mercadolibre/ml-token-repository.js";
import { createMlAuthClient } from "../../infrastructure/mercadolibre/ml-auth-client.js";
import { createMLApiClient } from "../../infrastructure/mercadolibre/ml-api-client.js";
import { getMercadoLibreSecrets } from "../../infrastructure/mercadolibre/ml-secrets-client.js";
import { createGetValidAccessToken } from "../../application/mercadolibre/get-valid-access-token.js";
import type { GetEventIdParams, QueuePayload } from "../../application/types.js";
import { getOrderIdFromPayload } from "../../application/mercadolibre/types.js";
import { WORKER_ENV } from "./env.js";

const { DYNAMO_TABLE, MELI_AUTH_SECRET_ARN, REGION, TELEGRAM_SECRET_ARN } = WORKER_ENV;

const dynamoClient = createDynamoClient(REGION);
const eventsRepository = createEventsRepository(dynamoClient);
const telegram = createTelegramClient(TELEGRAM_SECRET_ARN);
const { clientId, clientSecret } = await getMercadoLibreSecrets(MELI_AUTH_SECRET_ARN);
const mlTokenRepository = createMLTokenRepository({
  client: dynamoClient,
  tableName: DYNAMO_TABLE,
  tokenId: "mercadolibre",
});
const mlAuthClient = createMlAuthClient({
  clientId,
  clientSecret,
});
const getValidAccessToken = createGetValidAccessToken({
  tokenRepository: mlTokenRepository,
  authClient: mlAuthClient,
});
const mlApiClient = createMLApiClient({
  getAccessToken: getValidAccessToken,
});

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
      const saved = await eventsRepository.saveEventIfNotExists({
        tableName: DYNAMO_TABLE,
        eventId,
        payload,
      });
      if (!saved) {
        console.log("Skipping duplicate event:", eventId);
        continue;
      }
      const orderId = getOrderIdFromPayload(payload);
      if (!orderId) {
        console.warn("Order ID not found in payload.resource", payload);
        continue;
      }

      const order = await mlApiClient.getOrder(orderId);

      const message = [
        `MercadoLibre Order Event (order ${orderId}):`,
        "Payload:",
        `\`\`\`${JSON.stringify(payload, null, 2)}\`\`\``,
        "Order:",
        `\`\`\`${JSON.stringify(order, null, 2)}\`\`\``,
      ].join("\n");
      await telegram.sendMessage(message);
    } catch (error: unknown) {
      console.error("Worker failed to process message:", error);
      throw error;
    }
  }
};
