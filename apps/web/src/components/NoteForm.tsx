import { type NoteInput, NoteInputSchema } from "@sharencare/shared";
import { type KeyboardEvent, type SubmitEvent, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router";

const MAX_DESCRIPTION = 5000;

type NoteFormProps = {
  eyebrow: string;
  initial?: NoteInput;
  submitLabel: string;
  isPending: boolean;
  cancelTo: string;
  onSubmit: (input: NoteInput) => void;
};

const NoteForm = ({
  eyebrow,
  initial,
  submitLabel,
  isPending,
  cancelTo,
  onSubmit,
}: NoteFormProps) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = NoteInputSchema.safeParse({ title, description });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please check your note");
      return;
    }
    onSubmit(result.data);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  };

  const nearLimit = description.length > MAX_DESCRIPTION * 0.9;

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="card border border-base-content/10 bg-base-200 transition-colors focus-within:border-primary/50"
    >
      <div className="card-body gap-0 p-7 md:p-12">
        <span className="font-mono text-xs uppercase tracking-widest text-base-content/60">
          {eyebrow}
        </span>

        <label htmlFor="note-title" className="sr-only">
          Title
        </label>
        <input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give it a title"
          maxLength={120}
          autoComplete="off"
          className="mt-4 w-full bg-transparent font-serif text-2xl leading-tight caret-primary outline-none placeholder:text-base-content/25 md:text-4xl"
        />

        <div className="my-8 border-t border-dashed border-base-content/15" />

        <label htmlFor="note-description" className="sr-only">
          Description
        </label>
        <textarea
          id="note-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write what you want to say..."
          maxLength={MAX_DESCRIPTION}
          className="field-sizing-content min-h-48 w-full resize-none bg-transparent text-lg leading-8 caret-primary outline-none placeholder:text-base-content/25"
        />

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-base-content/15 pt-5">
          <span
            className={`font-mono text-xs tracking-widest ${nearLimit ? "text-warning" : "text-base-content/50"}`}
          >
            {description.length} / {MAX_DESCRIPTION}
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-xs text-base-content/40 md:inline">
              Ctrl + Enter
            </span>
            <Link to={cancelTo} className="btn btn-ghost btn-sm">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
              {isPending ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default NoteForm;
