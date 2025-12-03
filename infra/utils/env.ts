import { requireEnv } from "../../shared/env-utils.js";

export const CDK_ENV = {
  ACCOUNT: requireEnv("CDK_DEFAULT_ACCOUNT"),
  REGION: requireEnv("CDK_DEFAULT_REGION"),
};
