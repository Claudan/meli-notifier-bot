import { isTokenExpired } from "./types.js";
import type { MercadoLibreToken } from "./types.js";

export interface TokenRepository {
  get(): Promise<MercadoLibreToken | null>;
  save(token: MercadoLibreToken): Promise<void>;
}

export interface AuthClient {
  refreshToken(refreshToken: string): Promise<MercadoLibreToken>;
}

interface CreateGetValidAccessTokenParams {
  tokenRepository: TokenRepository;
  authClient: AuthClient;
}

export const createGetValidAccessToken = ({
  tokenRepository,
  authClient,
}: CreateGetValidAccessTokenParams) => {
  return async (): Promise<string> => {
    const token = await tokenRepository.get();

    if (!token) {
      throw new Error("MercadoLibre token not initialized");
    }

    if (!isTokenExpired(token)) {
      return token.accessToken;
    }

    const refreshed = await authClient.refreshToken(token.refreshToken);
    await tokenRepository.save(refreshed);

    return refreshed.accessToken;
  };
};
