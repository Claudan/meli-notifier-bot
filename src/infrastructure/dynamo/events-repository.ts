import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

interface CreateEventsRepositoryParams {
  client: DynamoDBDocumentClient;
  tableName: string;
}

export const createEventsRepository = ({ client, tableName }: CreateEventsRepositoryParams) => {
  const saveEventIfNotExists = async ({
    eventId,
    payload,
  }: {
    eventId: string;
    payload: unknown;
  }): Promise<boolean> => {
    const existing = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { eventId },
      }),
    );

    if (existing.Item) return false;

    await client.send(
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

  return { saveEventIfNotExists };
};

export type EventsRepository = ReturnType<typeof createEventsRepository>;
