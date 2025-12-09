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
        throw new Error(await res.text());
      }

      return res.json();
    },
  };
};

export type MLApiClient = ReturnType<typeof createMLApiClient>;
