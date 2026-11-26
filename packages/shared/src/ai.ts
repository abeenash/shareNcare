import { z } from "zod";

//the user will get 3 turns per day
export const AI_DAILY_SUGGESTIONS = 3;

export const AI_HELP_MAX_CHARS = 2000;

export const HelpMeWriteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a few words first, then ask for help")
    .max(
      AI_HELP_MAX_CHARS,
      `Koinonia can help with up to ${AI_HELP_MAX_CHARS} characters at a time`,
    ),

  noteId: z.uuid().optional(),
});

export type HelpMeWriteInput = z.input<typeof HelpMeWriteSchema>;
export type HelpMeWriteAnswer = { suggestion: string; remaining: number };
export type AiQuota = { remaining: number; reset: number };
