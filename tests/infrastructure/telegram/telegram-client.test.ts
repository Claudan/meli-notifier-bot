import { afterEach, describe, expect, it, vi } from "vitest";
import { createTelegramClient } from "../../../src/infrastructure/telegram/telegram-client.js";

const { send, SecretsManagerClient, GetSecretValueCommand } = vi.hoisted(() => {
  const send = vi.fn().mockResolvedValue({
    SecretString: JSON.stringify({
      telegramBotToken: "bot-token",
      telegramChatId: "chat-id",
    }),
  });

  type SecretsManagerThis = { send: typeof send };

  const SecretsManagerClient = vi.fn(function MockSecretsManagerClient(this: SecretsManagerThis) {
    this.send = send;
  });
  const GetSecretValueCommand = vi.fn(function MockGetSecretValueCommand(
    this: { input: { SecretId: string } },
    input: { SecretId: string },
  ) {
    this.input = input;
  });

  return { send, SecretsManagerClient, GetSecretValueCommand };
});

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient,
  GetSecretValueCommand,
}));

describe("createTelegramClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends message to Telegram with fetched credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createTelegramClient("arn:secret");

    await client.sendMessage("hello");

    const commandArg = send.mock.calls[0]?.[0] as { input: { SecretId: string } };
    expect(commandArg?.input).toEqual({ SecretId: "arn:secret" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.telegram.org/botbot-token/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: "chat-id",
        text: "hello",
        parse_mode: "Markdown",
      }),
    });
  });
});
