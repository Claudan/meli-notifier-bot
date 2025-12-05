import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";

export const createDynamoClient = (region: string) => {
  const config: DynamoDBClientConfig = { region };

  const dynamo = new DynamoDBClient(config);

  return DynamoDBDocumentClient.from(dynamo, {
    marshallOptions: { removeUndefinedValues: true },
  });
};
