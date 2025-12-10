import { describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";

const { send, SQSClient, SendMessageCommand } = vi.hoisted(() => {
  process.env.QUEUE_URL = "https://sqs.local/queue";
  process.env.AWS_REGION = "us-east-1";

  const send = vi.fn().mockResolvedValue({});
  const SQSClient = vi.fn(function MockSQSClient(this: { send: typeof send }) {
    this.send = send;
  });
  const SendMessageCommand = vi.fn(function MockSendMessageCommand(
    this: { input: { QueueUrl: string; MessageBody: string } },
    input: { QueueUrl: string; MessageBody: string },
  ) {
    this.input = input;
  });

  return { send, SQSClient, SendMessageCommand };
});

vi.mock("@aws-sdk/client-sqs", () => ({
  SQSClient,
  SendMessageCommand,
}));

type SendCommand = { input: { QueueUrl: string; MessageBody: string } };

import { handler } from "../../../src/functions/producer/handler.js";

describe("producer handler", () => {
  it("enqueues webhook payload to SQS", async () => {
    const payload = { foo: "bar" };
    const event: APIGatewayProxyEvent = {
      resource: "/",
      path: "/webhook",
      httpMethod: "POST",
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as unknown as APIGatewayProxyEvent["requestContext"],
      body: JSON.stringify(payload),
      isBase64Encoded: false,
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const commandArg = send.mock.calls[0]?.[0] as SendCommand;
    expect(commandArg?.input).toEqual({
      QueueUrl: "https://sqs.local/queue",
      MessageBody: JSON.stringify(payload),
    });
  });
});
