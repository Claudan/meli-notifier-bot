import { requireEnv } from "../../shared/env-utils.js";

export const ENV = {
  DYNAMO_TABLE: requireEnv("DYNAMO_TABLE"),
  REGION: requireEnv("AWS_REGION"),
  QUEUE_URL: requireEnv("QUEUE_URL"),
};
