import type { Callback, Context, SQSEvent } from "aws-lambda";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

const {
  saveEventIfNotExists,
  sendMessage,
  sendDocument,
  getOrder,
  downloadShippingLabel,
  getShipment,
  cropShippingLabel,
} = vi.hoisted(() => ({
  saveEventIfNotExists: vi.fn(),
  sendMessage: vi.fn(),
  sendDocument: vi.fn(),
  getOrder: vi.fn(),
  downloadShippingLabel: vi.fn(),
  getShipment: vi.fn(),
  cropShippingLabel: vi.fn(),
}));

vi.mock("../../../src/functions/worker/context.js", () => ({
  createWorkerContext: vi.fn().mockResolvedValue({
    eventsRepository: { saveEventIfNotExists },
    telegram: { sendMessage, sendDocument },
    mlApiClient: { getOrder, downloadShippingLabel, getShipment },
  }),
}));

vi.mock("../../../src/application/mercadolibre/label/crop-shipping-label.js", () => ({
  cropShippingLabel,
}));

import { handler } from "../../../src/functions/worker/handler.js";

describe("worker handler", () => {
  const orderPayload = {
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

  const baseOrder = {
    id: 2000014183891392,
    status: "paid",
    shipping: { id: 555 },
    buyer: { first_name: "John", last_name: "Doe", nickname: "jdoe" },
  };

  const baseShipment = {
    id: 555,
    logistic_type: "xd_drop_off",
    status: "handling" as const,
    shipping_items: [{ quantity: 1, description: "Product" }],
    receiver_address: {
      receiver_name: "John Doe",
      address_line: "Street 123",
      city: { name: "City" },
      state: { name: "State" },
    },
  };

  beforeEach(() => {
    saveEventIfNotExists.mockResolvedValue(true);
    sendMessage.mockResolvedValue(undefined);
    sendDocument.mockResolvedValue(undefined);
    getOrder.mockResolvedValue(baseOrder);
    getShipment.mockResolvedValue(baseShipment);
    downloadShippingLabel.mockResolvedValue(Buffer.from("pdf"));
    cropShippingLabel.mockResolvedValue(Buffer.from("cropped"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves new events, fetches order, and sends Telegram messages", async () => {
    const event: SQSEvent = {
      Records: [
        {
          messageId: "msg-1",
          receiptHandle: "rh-1",
          body: JSON.stringify(orderPayload),
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
      payload: orderPayload,
    });
    expect(getOrder).toHaveBeenCalledWith("2000014183891392");
    expect(downloadShippingLabel).toHaveBeenCalledWith(555);
    expect(sendDocument).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();
  });

  it("processes ready_to_ship shipments as well", async () => {
    getShipment.mockResolvedValueOnce({ ...baseShipment, status: "ready_to_ship" });

    const event: SQSEvent = {
      Records: [
        {
          messageId: "msg-2",
          receiptHandle: "rh-2",
          body: JSON.stringify(orderPayload),
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

    await handler(
      event,
      {} as Context,
      vi.fn() as Callback<void | import("aws-lambda").SQSBatchResponse>,
    );

    expect(getShipment).toHaveBeenCalledWith(555);
    expect(sendDocument).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();
  });

  it("sends the cropped PDF buffer to Telegram", async () => {
    const croppedBuffer = Buffer.from("cropped-pdf");
    const originalPdf = Buffer.from("original-pdf");
    downloadShippingLabel.mockResolvedValueOnce(originalPdf);
    cropShippingLabel.mockResolvedValueOnce(croppedBuffer);

    const event: SQSEvent = {
      Records: [
        {
          messageId: "msg-3",
          receiptHandle: "rh-3",
          body: JSON.stringify(orderPayload),
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

    await handler(
      event,
      {} as Context,
      vi.fn() as Callback<void | import("aws-lambda").SQSBatchResponse>,
    );

    expect(downloadShippingLabel).toHaveBeenCalledWith(555);
    expect(cropShippingLabel).toHaveBeenCalledWith(originalPdf);
    expect(sendDocument).toHaveBeenCalledWith({
      buffer: croppedBuffer,
      filename: "etiqueta-555.pdf",
      caption: "Etiqueta de envío 📄",
    });
  });
});
