import { requireEnv } from "../../../shared/env-utils.js";

export const WORKER_ENV = {
  DYNAMO_TABLE: requireEnv("DYNAMO_TABLE"),
  REGION: requireEnv("AWS_REGION"),
  TELEGRAM_SECRET_ARN: requireEnv("TELEGRAM_SECRET_ARN"),
};
