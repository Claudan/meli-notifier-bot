import type { SaveEventIfNotExistsParams } from "./types.js";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamo-client.js";

export const saveEventIfNotExists = async ({
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

export const eventsRepository = {
  saveEventIfNotExists,
};
