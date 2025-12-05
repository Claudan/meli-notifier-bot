import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export const createTelegramClient = (secretArn: string) => {
  const secrets = new SecretsManagerClient({});

  const getCredentials = async () => {
    const res = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }));

    if (!res.SecretString) throw new Error("Telegram secret is empty");

    const parsed = JSON.parse(res.SecretString);
    return {
      botToken: parsed.telegramBotToken as string,
      chatId: parsed.telegramChatId as string,
    };
  };

  const sendMessage = async (message: string) => {
    const { botToken, chatId } = await getCredentials();

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Telegram API error: ${err}`);
    }

    return true;
  };

  return { sendMessage };
};
