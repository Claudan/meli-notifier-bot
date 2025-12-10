import type { QueuePayload } from "../types.js";

export interface MercadoLibreToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface MercadoLibreTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface MercadoLibreOrder {
  id: number;
  status: string;
  total_amount?: number;
  shipping?: {
    id: number;
  };
  order_items?: Array<{
    quantity: number;
    item: {
      id: string;
      title: string;
      variation_attributes?: Array<{
        name: string;
        value_name: string;
      }>;
    };
  }>;
  buyer?: {
    nickname?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface MercadoLibreShipment {
  id: number;
  status: string;
  shipping_items: Array<{
    quantity: number;
    description: string;
  }>;
  receiver_address: {
    address_line: string;
    receiver_name: string;
    city: {
      name: string;
    };
    state: {
      name: string;
    };
  };
}

export interface MercadoLibreOrderWebhookPayload extends QueuePayload {
  _id: string;
  topic: string;
  resource: string;
  user_id: number;
  application_id: number;
  sent: string;
  attempts: number;
  received: string;
  actions: unknown[];
}

export interface OrderDTO {
  id: number;
  status: string;
  shippingId?: number;
}
export const isTokenExpired = (token: MercadoLibreToken): boolean => {
  return Date.now() >= token.expiresAt - 60_000;
};

export const isMercadoLibreTokenResponse = (data: unknown): data is MercadoLibreTokenResponse => {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.access_token === "string" &&
    typeof candidate.refresh_token === "string" &&
    typeof candidate.expires_in === "number"
  );
};

export const getOrderIdFromPayload = (payload: QueuePayload): string | null => {
  const { resource } = payload as { resource?: unknown };
  if (typeof resource !== "string") return null;
  const match = /\/orders\/(\d+)/.exec(resource);
  return match?.[1] ?? null;
};

export const isMercadoLibreOrder = (value: unknown): value is MercadoLibreOrder => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== "number") return false;
  if (typeof candidate.status !== "string") return false;

  if (candidate.shipping !== undefined) {
    if (typeof candidate.shipping !== "object" || candidate.shipping === null) {
      return false;
    }

    const shipping = candidate.shipping as Record<string, unknown>;

    if (typeof shipping.id !== "number") return false;
  }

  return true;
};

export const isMercadoLibreShipment = (value: unknown): value is MercadoLibreShipment => {
  if (!value || typeof value !== "object") return false;

  const c = value as Record<string, unknown>;

  if (typeof c.id !== "number") return false;
  if (typeof c.status !== "string") return false;

  if (!Array.isArray(c.shipping_items)) return false;
  if (!c.receiver_address || typeof c.receiver_address !== "object") return false;

  return true;
};

export const mapMLOrderToOrderDTO = (order: MercadoLibreOrder): OrderDTO => {
  const dto: OrderDTO = {
    id: order.id,
    status: order.status,
  };
  if (order.shipping) dto.shippingId = order.shipping.id;
  return dto;
};
