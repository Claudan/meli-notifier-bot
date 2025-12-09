import { requireEnv } from "../../../shared/env-utils.js";

export const WORKER_ENV = {
  EVENTS_TABLE_NAME: requireEnv("EVENTS_TABLE_NAME"),
  MELI_AUTH_SECRET_ARN: requireEnv("MELI_AUTH_SECRET_ARN"),
  MELI_TOKENS_TABLE_NAME: requireEnv("MELI_TOKENS_TABLE_NAME"),
  REGION: requireEnv("AWS_REGION"),
  TELEGRAM_SECRET_ARN: requireEnv("TELEGRAM_SECRET_ARN"),
};
