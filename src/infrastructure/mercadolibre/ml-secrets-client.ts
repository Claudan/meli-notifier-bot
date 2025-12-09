import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});

interface MercadoLibreAuthSecrets {
  clientId: string;
  clientSecret: string;
  userId: string;
}

export const getMercadoLibreSecrets = async (
  secretArn: string,
): Promise<MercadoLibreAuthSecrets> => {
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));

  if (!res.SecretString) {
    throw new Error("MercadoLibre secret is empty");
  }

  const parsed = JSON.parse(res.SecretString);

  if (!parsed.clientId || !parsed.clientSecret) {
    throw new Error("Invalid MercadoLibre secret format");
  }

  return {
    clientId: parsed.clientId,
    clientSecret: parsed.clientSecret,
    userId: parsed.userId,
  };
};
