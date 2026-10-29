import { z } from "zod";

export const NoteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be 120 characters or less"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less."),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;

export const NoteIdSchema = z.object({ id: z.uuid("That is not a valid note id") });

export const NotePinSchema = z.object({ pinned: z.boolean() });
