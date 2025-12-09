import { fetchAndParse } from "../http/fetch-and-parse.js";
import { isMercadoLibreTokenResponse } from "../../application/mercadolibre/types.js";
import type {
  MercadoLibreToken,
  MercadoLibreTokenResponse,
} from "../../application/mercadolibre/types.js";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

interface CreateMlAuthClientParams {
  clientId: string;
  clientSecret: string;
}

export const createMlAuthClient = ({ clientId, clientSecret }: CreateMlAuthClientParams) => {
  return {
    async refreshToken(refreshToken: string): Promise<MercadoLibreToken> {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      const res = await fetch(ML_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`ML token refresh failed: ${err}`);
      }

      const data: MercadoLibreTokenResponse = await fetchAndParse(
        res,
        isMercadoLibreTokenResponse,
        "Invalid ML refresh token response",
      );

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
    },
  };
};
