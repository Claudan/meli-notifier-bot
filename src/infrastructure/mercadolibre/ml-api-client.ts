import { fetchAndParse } from "../http/fetch-and-parse.js";
import { isMercadoLibreOrder } from "../../application/mercadolibre/types.js";

interface CreateMLApiClientParams {
  getAccessToken: () => Promise<string>;
}

const ML_API_BASE = "https://api.mercadolibre.com";

export const createMLApiClient = ({ getAccessToken }: CreateMLApiClientParams) => {
  return {
    async getOrder(orderId: string) {
      const token = await getAccessToken();

      const res = await fetch(`${ML_API_BASE}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch order ${orderId}: ${await res.text()}`);
      }

      return fetchAndParse(res, isMercadoLibreOrder, "Invalid MercadoLibre order response");
    },

    async downloadShippingLabel(shippingId: number): Promise<Buffer> {
      const token = await getAccessToken();

      const res = await fetch(
        `${ML_API_BASE}/shipment_labels?shipment_ids=${shippingId}&response_type=pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error(`Failed to download shipping label ${shippingId}: ${await res.text()}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
  };
};

export type MLApiClient = ReturnType<typeof createMLApiClient>;
