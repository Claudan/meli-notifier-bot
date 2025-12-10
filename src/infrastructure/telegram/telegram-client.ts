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

  const sendDocument = async (params: { buffer: Buffer; filename: string; caption?: string }) => {
    const { botToken, chatId } = await getCredentials();

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;

    const form = new FormData();
    form.set("chat_id", chatId);
    form.set("document", new Blob([params.buffer]), params.filename);

    if (params.caption) {
      form.set("caption", params.caption);
      form.set("parse_mode", "Markdown");
    }

    const res = await fetch(url, {
      method: "POST",
      body: form,
    } satisfies RequestInit);

    if (!res.ok) {
      throw new Error(`Telegram sendDocument error: ${await res.text()}`);
    }
  };

  return { sendDocument, sendMessage };
};

export type TelegramClient = ReturnType<typeof createTelegramClient>;
