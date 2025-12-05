import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { ENV } from "../../utils/env.js";

const { REGION } = ENV;

const createClient = () => {
  const config: DynamoDBClientConfig = { region: REGION };

  const dynamo = new DynamoDBClient(config);

  return DynamoDBDocumentClient.from(dynamo, {
    marshallOptions: { removeUndefinedValues: true },
  });
};

export const docClient = createClient();
