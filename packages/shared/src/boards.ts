import { z } from "zod";
import { ShareTokenSchema } from "./notes";

export const BOARD_COLORS = ["yellow", "pink", "blue", "green"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

//abuse limits. a board holds at most this many notes, and a note is hidden for the owner to review once this many different people report it
export const BOARD_NOTE_LIMIT = 200;
export const REPORTS_TO_HIDE = 3;

/*the live line to a board (WebSocket)
1.changed => It means "something on the board changed, fetch it again". The note themselves always
come from the normal GET, so the line can never leak a hidden note.
2.here => It means how many pages have this board open right now
3.writing => first names of the people typing a note right now, but never one's own*/
export const LiveMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("changed") }),
  z.object({ type: z.literal("here"), count: z.number().int().min(0) }),
  z.object({ type: z.literal("writing"), names: z.array(z.string()) }),
]);

export type LiveMessage = z.infer<typeof LiveMessageSchema>;

//what a browser may say
export const LiveRequestSchema = z.object({ type: z.literal("writing") });
export type LiveRequest = z.infer<typeof LiveRequestSchema>;

//throttle set: a typing browser says "writing" at most this often
export const WRITING_SIGNAL_EVERY = 2_000;

/* the lease: ..and the server forgets it this long after the last one. Longer than the gap
between signals, so someone typing steadily never flickers off*/
export const WRITING_FADES_AFTER = 5_000;

//this will be the close code for "this board is gone, deleted, or its link was changed"
export const BOARD_GONE = 4404;

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
