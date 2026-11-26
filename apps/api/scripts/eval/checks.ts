export type EvalCase = {
  name: string;
  draft: string;
  keep?: string[];
  never?: string[];
  devanagari?: boolean;
  mayShorten?: boolean;
};

const PREAMBLE = /^(sure|certainly|of course|here is|here's|i have rewritten)\b/i;

function devanagariShare(text: string) {
  const nepali = text.match(/\p{Script=Devanagari}/gu)?.length ?? 0;
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0;
  return nepali / Math.max(1, nepali + latin);
}

export function checkSuggestion(letter: EvalCase, answer: string | null): string[] {
  if (answer === null) return ["no answer we could show (empty, or too long to save)"];

  const problems: string[] = [];
  const lower = answer.toLowerCase();

  for (const word of letter.keep ?? []) {
    if (!lower.includes(word.toLowerCase())) problems.push(`lost "${word}"`);
  }
  for (const word of letter.never ?? []) {
    if (lower.includes(word.toLowerCase())) problems.push(`said "${word}"`);
  }
  if (!letter.mayShorten && answer.length < letter.draft.length * 0.5)
    problems.push("far shorter than the letter");

  if (answer.length > Math.max(letter.draft.length * 2, 300)) {
    problems.push("far longer than the letter");
  }
  if (PREAMBLE.test(answer)) problems.push("talks to us instead of rewriting");
  if (letter.devanagari && devanagariShare(answer) < 0.5) problems.push("switched out of Nepali");

  return problems;
}
