import type * as cdk from "aws-cdk-lib";

export function resolveCdkEnv(): cdk.Environment {
  const account = process.env.CDK_DEFAULT_ACCOUNT;
  const region = process.env.CDK_DEFAULT_REGION;

  const env: cdk.Environment = {
    ...(account ? { account } : {}),
    ...(region ? { region } : {}),
  };

  return env;
}
