import { z } from "zod";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatRequest = {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  extra?: Record<string, unknown>;
};

const AnswerSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
        finish_reason: z.string().nullish(),
      }),
    )
    .min(1),
});

const ANSWER_TIME_LIMIT_MS = 30_000;

export async function chatCompletion({
  url,
  apiKey,
  model,
  messages,
  maxTokens,
  extra,
}: ChatRequest) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...extra, model, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(ANSWER_TIME_LIMIT_MS),
  });

  if (!res.ok) throw new Error(`The AI provider answered ${res.status}`);

  const answer = AnswerSchema.safeParse(await res.json().catch(() => null));
  if (!answer.success) throw new Error("The AI provider sent an answer we can't read");

  const [choice] = answer.data.choices;
  if (choice?.finish_reason === "length") throw new Error("The AI answer was cut off");
  return choice?.message.content ?? "";
}
