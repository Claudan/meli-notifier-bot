import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});

export const getTelegramCredentials = async () => {
  const secretArn = process.env.TELEGRAM_SECRET_ARN;
  if (!secretArn) throw new Error("TELEGRAM_SECRET_ARN not set");

  const res = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));

  if (!res.SecretString) throw new Error("SecretString is empty");

  const parsed = JSON.parse(res.SecretString);

  return {
    botToken: parsed.telegramBotToken as string,
    chatId: parsed.telegramChatId as string,
  };
};

export const sendTelegramMessage = async (message: string) => {
  const { botToken, chatId } = await getTelegramCredentials();

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  console.log("Telegram URL:", url);
  console.log("botToken length:", botToken.length);
  console.log("chatId:", chatId);

  const body = {
    chat_id: chatId,
    text: message,
    parse_mode: "Markdown",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Telegram API error:", err);
    throw new Error(`Failed to send Telegram message: ${response.statusText}`);
  }

  return true;
};
