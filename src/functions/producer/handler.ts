import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ENV } from "../../utils/env.js";

const { QUEUE_URL, REGION } = ENV;

const sqs = new SQSClient({ region: REGION });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Cloudwatch logs
  console.log("Webhook event received:", JSON.stringify(event));

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(body),
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error: unknown) {
    console.error("Producer error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "producer_failed" }),
    };
  }
};
