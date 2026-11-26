import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { env } from "../env";
import { ai, FAKE_SUGGESTION } from "./ai";

const MESSAGES = [{ role: "user" as const, content: "Hello" }];
const saved = { ...env };

//A pretend provider
const provider = () =>
  spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ choices: [{ message: { content: "Hi" }, finish_reason: "stop" }] }),
  );

afterEach(() => {
  Object.assign(env, saved);
  (globalThis.fetch as unknown as { mockRestore?: () => void }).mockRestore?.();
});

describe("ai.complete", () => {
  test("the practice model never leaves the server", async () => {
    const fetchSpy = provider();
    expect(await ai.complete(MESSAGES)).toBe(FAKE_SUGGESTION);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("Cloudflare: your account's address, the model, the answer limit, thinking off", async () => {
    Object.assign(env, {
      AI_PROVIDER: "cloudflare",
      CLOUDFLARE_ACCOUNT_ID: "acc123",
      AI_API_KEY: "test-token",
      AI_MODEL: "@cf/google/gemma-4-26b-a4b-it",
    });
    const fetchSpy = provider();
    expect(await ai.complete(MESSAGES)).toBe("Hi");

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/acc123/ai/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-token");
    expect(JSON.parse(String(init?.body))).toEqual({
      chat_template_kwargs: { enable_thinking: false },
      model: "@cf/google/gemma-4-26b-a4b-it",
      messages: MESSAGES,
      max_tokens: 1000,
    });
  });

  test("Groq gets no Cloudflare-only settings", async () => {
    Object.assign(env, { AI_PROVIDER: "groq", AI_API_KEY: "test-key", AI_MODEL: "some-model" });
    const fetchSpy = provider();
    await ai.complete(MESSAGES);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("chat_template_kwargs");
  });
});
