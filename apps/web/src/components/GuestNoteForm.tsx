import { BOARD_COLORS, type BoardColor, BoardNoteFormSchema } from "@sharencare/shared";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { usePostBoardNote } from "../board-queries";
import FieldError from "./FieldError";
import { STICKY_COLORS } from "./StickyNote";

type GuestNoteFormProps = {
  token: string;
  onTyping: () => void;
};

const MAX_MESSAGE = 500;

const GuestNoteForm = ({ token, onTyping }: GuestNoteFormProps) => {
  const postNote = usePostBoardNote(token);

  const form = useForm({
    defaultValues: { message: "", color: "yellow" as BoardColor },
    validators: { onChange: BoardNoteFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await postNote.mutateAsync(value);
      } catch {
        return; // the hook already showed the error, and the words stay in the form
      }
      toast.success("Your note is on the board");
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="card border border-base-content/10 bg-base-200"
    >
      <div className="card-body gap-5 p-6 md:p-8">
        <div>
          <h2 className="font-serif text-2xl">Add your note</h2>
          <p className="mt-1 text-sm text-base-content/60">Your first name will appear on it.</p>
        </div>

        <form.Field name="message">
          {(field) => (
            <div>
              <label htmlFor="guest-message" className="mb-1 block text-sm text-base-content/70">
                Your message
              </label>
              <textarea
                id="guest-message"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  onTyping();
                }}
                onBlur={field.handleBlur}
                maxLength={MAX_MESSAGE}
                className="textarea field-sizing-content min-h-32 w-full bg-base-100 text-base"
              />
              <div className="flex justify-between gap-4">
                <FieldError meta={field.state.meta} />
                <span className="mt-1 ml-auto font-mono text-xs text-base-content/50">
                  {field.state.value.length} / {MAX_MESSAGE}
                </span>
              </div>
            </div>
          )}
        </form.Field>

        <form.Field name="color">
          {(field) => (
            <fieldset>
              <legend className="mb-2 text-sm text-base-content/70">Colour</legend>
              <div className="flex gap-3">
                {BOARD_COLORS.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      checked={field.state.value === color}
                      onChange={() => field.handleChange(color)}
                      aria-label={color}
                      className="peer sr-only"
                    />
                    <span
                      className={`block size-9 rounded-full ring-offset-2 ring-offset-base-200 peer-checked:ring-2
                      peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-base-content
                      ${STICKY_COLORS[color]}`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button type="submit" className="btn btn-primary self-start" disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Post my note"}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};

export default GuestNoteForm;
