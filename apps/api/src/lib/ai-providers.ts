export const cloudflareChatUrl = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export const MAX_ANSWER_TOKENS = 1000;

export const CLOUDFLARE_EXTRA = {
  chat_template_kwargs: {
    enable_thinking: false,
  },
};
