#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MainStack } from "../lib/main-stack.js";
import { CDK_ENV } from "../utils/env.js";

const { ACCOUNT, REGION } = CDK_ENV;

const app = new cdk.App();

const env = {
  account: ACCOUNT,
  region: REGION,
};

new MainStack(app, "MeliNotifierBotStack", { env });
