import { requireEnv } from "../utils/env-utils.js";

export const PRODUCER_ENV = {
  QUEUE_URL: requireEnv("QUEUE_URL"),
  REGION: requireEnv("AWS_REGION"),
};
