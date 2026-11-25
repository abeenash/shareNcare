import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { chatCompletion } from "./chat-completions";

const request = {
  url: "https://ai.example.com/v1/chat/completions",
  apiKey: "test-key",
  model: "@cf/test/model",
  messages: [{ role: "user" as const, content: "Hello" }],
  maxTokens: 100,
};

function provider(body: unknown, status = 200) {
  return spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body, { status }));
}

const answer = (content: string | null, finish_reason = "stop") => ({
  choices: [{ message: { content }, finish_reason }],
});

afterEach(() => {
  (globalThis.fetch as unknown as { mockRestore?: () => void }).mockRestore?.();
});

describe("chatCompletion", () => {
  test("sends the model, messages and answer limit, with the key as a Bearer token", async () => {
    const fetchSpy = provider(answer("Hi there"));
    await chatCompletion(request);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(request.url);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "@cf/test/model",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 100,
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  test("returns the words of the first choice", async () => {
    provider(answer("Hi there"));
    expect(await chatCompletion(request)).toBe("Hi there");
  });

  test("a refusal names only the status, never the provider's words", async () => {
    provider({ error: "your letter about cardamom was too long" }, 429);
    const failed = chatCompletion(request);
    await expect(failed).rejects.toThrow("The AI provider answered 429");
    await expect(failed).rejects.not.toThrow("cardamom");
  });

  test("an answer in the wrong shape is refused", async () => {
    provider({ something: "else" });
    await expect(chatCompletion(request)).rejects.toThrow("an answer we can't read");
  });

  test("an answer cut off by the token limit is refused", async () => {
    provider(answer("Dear Didi, I wanted to say", "length"));
    await expect(chatCompletion(request)).rejects.toThrow("cut off");
  });
});
