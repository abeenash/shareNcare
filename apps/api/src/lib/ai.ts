import { env } from "../env";
import { type ChatMessage, chatCompletion } from "./chat-completions";

//for tests and e2e
export const FAKE_SUGGESTION =
  "This is a practice suggestion from the fake model. A real AI would rewrite your letter here.";

const MAX_ANSWER_TOKENS = 1000;

const CLOUDFLARE_URL = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const ai = {
  async complete(messages: ChatMessage[]): Promise<string> {
    const shared = {
      apiKey: env.AI_API_KEY ?? "",
      model: env.AI_MODEL ?? "",
      messages,
      maxTokens: MAX_ANSWER_TOKENS,
    };
    switch (env.AI_PROVIDER) {
      case "fake":
        return FAKE_SUGGESTION;
      case "cloudflare":
        return chatCompletion({ url: CLOUDFLARE_URL(env.CLOUDFLARE_ACCOUNT_ID ?? ""), ...shared });
      case "groq":
        return chatCompletion({ url: GROQ_URL, ...shared });
    }
  },
};
