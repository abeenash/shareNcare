import { env } from "../env";
import {
  CLOUDFLARE_EXTRA,
  cloudflareChatUrl,
  GROQ_CHAT_URL,
  MAX_ANSWER_TOKENS,
} from "./ai-providers";
import { type ChatMessage, chatCompletion } from "./chat-completions";

//for tests and e2e
export const FAKE_SUGGESTION =
  "This is a practice suggestion from the fake model. A real AI would rewrite your letter here.";

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
        return chatCompletion({
          url: cloudflareChatUrl(env.CLOUDFLARE_ACCOUNT_ID ?? ""),
          extra: CLOUDFLARE_EXTRA,
          ...shared,
        });
      case "groq":
        return chatCompletion({ url: GROQ_CHAT_URL, ...shared });
    }
  },
};
