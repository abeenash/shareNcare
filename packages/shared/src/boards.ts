import { z } from "zod";
import { ShareTokenSchema } from "./notes";

export const BOARD_COLORS = ["yellow", "pink", "blue", "green"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

//abuse limits. a board holds at most this many notes, and a note is hidden for the owner to review once this many different people report it
export const BOARD_NOTE_LIMIT = 200;
export const REPORTS_TO_HIDE = 3;

export const BoardInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the board a title")
    .max(80, "Title must be 80 characters or less"),
  recipient: z
    .string()
    .trim()
    .min(1, "Who is this board for?")
    .max(60, "Name must be 60 characters or less"),
});

export type BoardInput = z.infer<typeof BoardInputSchema>;

// No name field: the name on a note comes from the writer's account
export const BoardNoteInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a few words")
    .max(500, "Keep it to 500 characters or less"),
  color: z.enum(BOARD_COLORS).default("yellow"),
});

export type BoardNoteInput = z.input<typeof BoardNoteInputSchema>;

export const BoardNoteFormSchema = BoardNoteInputSchema.extend({ color: z.enum(BOARD_COLORS) });

export const BoardIdSchema = z.object({
  id: z.uuid("That is not a valid board id"),
});

export const BoardNoteIdSchema = BoardIdSchema.extend({
  noteId: z.uuid("That is not a valid note id"),
});

export const BoardLinkNoteSchema = ShareTokenSchema.extend({
  noteId: z.uuid("That is not a valid note id"),
});

export const BoardOpenSchema = z.object({ open: z.boolean() });

export const NoteHiddenSchema = z.object({ hidden: z.boolean() });
