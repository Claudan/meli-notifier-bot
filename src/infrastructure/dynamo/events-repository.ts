import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { SaveEventIfNotExistsParams } from "./types.js";

export const createEventsRepository = (docClient: DynamoDBDocumentClient) => {
  const saveEventIfNotExists = async ({
    tableName,
    eventId,
    payload,
  }: SaveEventIfNotExistsParams) => {
    const existing = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { eventId },
      }),
    );

    if (existing.Item) return false;

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          eventId,
          createdAt: Date.now(),
          payload,
        },
        ConditionExpression: "attribute_not_exists(eventId)",
      }),
    );

    return true;
  };

  return {
    saveEventIfNotExists,
  };
};
