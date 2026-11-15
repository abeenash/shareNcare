import { z } from "zod";

export const MAX_DESCRIPTION = 5000;

//4 characters for every 3 bytes
export const LOCKED_BOX = /^v1\.[\w-]{16}\.[\w-]{23,}$/; //<- 20 characters in front = "v1."(3) + the 12-byte iv written as 16 characters
export const MAX_LOCKED_BOX = 20 + Math.ceil(((MAX_DESCRIPTION * 3 + 16) * 4) / 3);

//43 characters for 32 bytes, random bytes
export const LETTER_KEY = /^[\w-]{43}$/;

export const LetterKeysSchema = z.record(z.string(), z.string().regex(LETTER_KEY));
export type LetterKeys = z.infer<typeof LetterKeysSchema>;

export const NoteInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(120, "Title must be 120 characters or less"),
    description: z.string().trim().min(1, "Description is required"),
    recipient: z
      .string()
      .trim()
      .max(60, "Name must be 60 characters or less")
      .nullish()
      .transform((name) => name || null),
    locked: z.boolean().default(false),
  })
  .superRefine((note, ctx) => {
    if (!note.locked && note.description.length > MAX_DESCRIPTION) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: `Description must be ${MAX_DESCRIPTION} characters or less.`,
      });
    }
    if (
      note.locked &&
      (!LOCKED_BOX.test(note.description) || note.description.length > MAX_LOCKED_BOX)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: "A locked letter must arrive locked",
      });
    }
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

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const TRASH_DAYS = 30;

export const PhotoUploadRequestSchema = z.object({
  size: z.number().int().positive().max(MAX_PHOTO_BYTES, "That photo is too large"),
});

export const PhotoAttachSchema = z.object({
  key: z.string().regex(/^notes\/[\w-]+\/[\w-]+$/, "That is not a photo key"),
});
