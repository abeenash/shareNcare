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
  recipient: z
    .string()
    .trim()
    .max(60, "Name must be 60 characters or less")
    .nullish()
    .transform((name) => name || null),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;

export const NoteIdSchema = z.object({ id: z.uuid("That is not a valid note id") });

export const NotePinSchema = z.object({ pinned: z.boolean() });

export const ShareTokenSchema = z.object({
  token: z.string().regex(/^[\w-]{22}$/, "That is not a valid share link"),
});

export const ShareOptionsSchema = z.object({
  burnAfterReading: z.boolean().default(false),
  unsealAt: z.iso
    .datetime("That is not a valid date")
    .nullish()
    .transform((date) => (date ? new Date(date) : null))
    .refine((date) => !date || date > new Date(), "A seal date must be in the future"),
});

export type ShareOptions = z.input<typeof ShareOptionsSchema>;
