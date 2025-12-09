import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { MercadoLibreToken } from "../../application/mercadolibre/types.js";

export interface MLTokenRepository {
  get(): Promise<MercadoLibreToken | null>;
  save(token: MercadoLibreToken): Promise<void>;
}

interface CreateMLTokenRepositoryParams {
  client: DynamoDBDocumentClient;
  tableName: string;
  tokenId: string;
}

export const createMLTokenRepository = ({
  client,
  tableName,
  tokenId,
}: CreateMLTokenRepositoryParams): MLTokenRepository => {
  return {
    async get() {
      const result = await client.send(
        new GetCommand({
          TableName: tableName,
          Key: { id: tokenId },
        }),
      );

      if (!result.Item) return null;

      return {
        accessToken: result.Item.accessToken,
        refreshToken: result.Item.refreshToken,
        expiresAt: result.Item.expiresAt,
      };
    },

    async save(token) {
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            id: tokenId,
            ...token,
          },
        }),
      );
    },
  };
};
