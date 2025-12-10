import type { Callback, Context, SQSEvent } from "aws-lambda";
import { describe, expect, it, vi, afterEach } from "vitest";

const {
  saveEventIfNotExists,
  sendMessage,
  sendDocument,
  getOrder,
  downloadShippingLabel,
  getShipment,
} = vi.hoisted(() => ({
  saveEventIfNotExists: vi.fn().mockResolvedValue(true),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  sendDocument: vi.fn().mockResolvedValue(undefined),
  getOrder: vi.fn().mockResolvedValue({
    id: 2000014183891392,
    status: "paid",
    shipping: { id: 555 },
    buyer: { first_name: "John", last_name: "Doe", nickname: "jdoe" },
  }),
  downloadShippingLabel: vi.fn().mockResolvedValue(Buffer.from("pdf")),
  getShipment: vi.fn().mockResolvedValue({
    id: 555,
    status: "ready_to_ship",
    shipping_items: [{ quantity: 1, description: "Product" }],
    receiver_address: {
      receiver_name: "John Doe",
      address_line: "Street 123",
      city: { name: "City" },
      state: { name: "State" },
    },
  }),
}));

vi.mock("../../../src/functions/worker/context.js", () => ({
  createWorkerContext: vi.fn().mockResolvedValue({
    eventsRepository: { saveEventIfNotExists },
    telegram: { sendMessage, sendDocument },
    mlApiClient: { getOrder, downloadShippingLabel, getShipment },
  }),
}));

import { handler } from "../../../src/functions/worker/handler.js";

describe("worker handler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves new events, fetches order, and sends Telegram messages", async () => {
    const payload = {
      _id: "1583707e-480f-476f-8f58-3910fc7034f6",
      topic: "orders_v2",
      resource: "/orders/2000014183891392",
      user_id: 1019521750,
      application_id: 6885024936367556,
      sent: "2025-12-07T18:58:57.668Z",
      attempts: 1,
      received: "2025-12-07T18:58:57.531Z",
      actions: [],
    };

    const event: SQSEvent = {
      Records: [
        {
          messageId: "msg-1",
          receiptHandle: "rh-1",
          body: JSON.stringify(payload),
          attributes: {
            ApproximateReceiveCount: "1",
            SentTimestamp: "0",
            SenderId: "local",
            ApproximateFirstReceiveTimestamp: "0",
          },
          messageAttributes: {},
          md5OfBody: "md5",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:local:queue",
          awsRegion: "us-east-1",
        },
      ],
    };

    const context = {} as Context;
    const callback = vi.fn() as Callback<void | import("aws-lambda").SQSBatchResponse>;

    await handler(event, context, callback);

    expect(saveEventIfNotExists).toHaveBeenCalledWith({
      eventId: "msg-1",
      payload,
    });
    expect(getOrder).toHaveBeenCalledWith("2000014183891392");
    expect(downloadShippingLabel).toHaveBeenCalledWith(555);
    expect(sendDocument).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();
  });
});
