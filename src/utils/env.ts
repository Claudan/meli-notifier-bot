import { requireEnv } from "../../shared/env-utils.js";

export const ENV = {
  REGION: requireEnv("AWS_REGION"),
  QUEUE_URL: requireEnv("QUEUE_URL"),
};
