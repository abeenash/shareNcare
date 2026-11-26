import { z } from "zod";
import { CLOUDFLARE_EXTRA, cloudflareChatUrl, MAX_ANSWER_TOKENS } from "../src/lib/ai-providers";
import { chatCompletion } from "../src/lib/chat-completions";
import { cleanSuggestion, helpMeWriteMessages } from "../src/lib/help-me-write";
import { CASES } from "./eval/cases";
import { checkSuggestion } from "./eval/checks";

const config = z
  .object({
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
    AI_API_KEY: z.string().min(1),
    AI_MODEL: z.string().min(1),
  })
  .parse(process.env);

let passed = 0;

for (const letter of CASES) {
  const started = performance.now();
  let answer: string | null = null;
  let problems: string[];
  try {
    answer = cleanSuggestion(
      await chatCompletion({
        url: cloudflareChatUrl(config.CLOUDFLARE_ACCOUNT_ID),
        apiKey: config.AI_API_KEY,
        model: config.AI_MODEL,
        messages: helpMeWriteMessages(letter.draft),
        maxTokens: MAX_ANSWER_TOKENS,
        extra: CLOUDFLARE_EXTRA,
      }),
    );
    problems = checkSuggestion(letter, answer);
  } catch (error) {
    problems = [error instanceof Error ? error.message : "the request failed"];
  }

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (problems.length === 0) passed++;
  console.log(`${problems.length === 0 ? "PASS" : "FAIL"}  ${letter.name} (${seconds} s)`);
  for (const problem of problems) console.log(`      - ${problem}`);
  if (answer) console.log(`      > ${answer.replaceAll("\n", "\n      > ")}`);
}

console.log(`\n${passed}/${CASES.length} passed on ${config.AI_MODEL}`);
if (passed < CASES.length) process.exitCode = 1;
