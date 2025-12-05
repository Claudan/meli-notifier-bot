import type { SQSRecord } from "aws-lambda";

export interface QueuePayload {
  id?: string | number;
  [key: string]: unknown;
}

export interface GetEventIdParams {
  payload: QueuePayload;
  record: SQSRecord;
}
