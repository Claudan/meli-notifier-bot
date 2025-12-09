import { createTelegramClient } from "../../infrastructure/telegram/telegram-client.js";
import { createDynamoClient } from "../../infrastructure/dynamo/dynamo-client.js";
import { createEventsRepository } from "../../infrastructure/dynamo/events-repository.js";
import { createMLTokenRepository } from "../../infrastructure/mercadolibre/ml-token-repository.js";
import { createMlAuthClient } from "../../infrastructure/mercadolibre/ml-auth-client.js";
import { createMLApiClient } from "../../infrastructure/mercadolibre/ml-api-client.js";
import { createGetValidAccessToken } from "../../application/mercadolibre/get-valid-access-token.js";
import { getMercadoLibreSecrets } from "../../infrastructure/mercadolibre/ml-secrets-client.js";
import { WORKER_ENV } from "./env.js";

import type { EventsRepository } from "../../infrastructure/dynamo/events-repository.js";
import type { TelegramClient } from "../../infrastructure/telegram/telegram-client.js";
import type { MLApiClient } from "../../infrastructure/mercadolibre/ml-api-client.js";

export interface WorkerContext {
  eventsRepository: EventsRepository;
  telegram: TelegramClient;
  mlApiClient: MLApiClient;
}

let cachedContext: WorkerContext | null = null;

const ML_TOKEN_KEY = "mercadolibre";

export const createWorkerContext = async (): Promise<WorkerContext> => {
  if (cachedContext) return cachedContext;

  const {
    EVENTS_TABLE_NAME,
    MELI_TOKENS_TABLE_NAME,
    REGION,
    TELEGRAM_SECRET_ARN,
    MELI_AUTH_SECRET_ARN,
  } = WORKER_ENV;

  const dynamoClient = createDynamoClient(REGION);

  const eventsRepository = createEventsRepository({
    client: dynamoClient,
    tableName: EVENTS_TABLE_NAME,
  });

  const telegram = createTelegramClient(TELEGRAM_SECRET_ARN);

  const { clientId, clientSecret } = await getMercadoLibreSecrets(MELI_AUTH_SECRET_ARN);

  const mlTokenRepository = createMLTokenRepository({
    client: dynamoClient,
    tableName: MELI_TOKENS_TABLE_NAME,
    tokenKey: ML_TOKEN_KEY,
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

  cachedContext = {
    eventsRepository,
    telegram,
    mlApiClient,
  };

  return cachedContext;
};
