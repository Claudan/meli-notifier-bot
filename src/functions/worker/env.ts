import { requireEnv } from "../../../shared/env-utils.js";

export const WORKER_ENV = {
  DYNAMO_TABLE: requireEnv("DYNAMO_TABLE"),
  MELI_AUTH_SECRET_ARN: requireEnv("MELI_AUTH_SECRET_ARN"),
  REGION: requireEnv("AWS_REGION"),
  TELEGRAM_SECRET_ARN: requireEnv("TELEGRAM_SECRET_ARN"),
};
