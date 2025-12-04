#!/usr/bin/env node
import "source-map-support/register.js";
import * as cdk from "aws-cdk-lib";
import { MainStack } from "../lib/main-stack.js";
import { resolveCdkEnv } from "../utils/env.js";

const app = new cdk.App();

const env = resolveCdkEnv();

new MainStack(app, "MeliNotifierBotStack", { env });
