import { MAX_DESCRIPTION, type NoteInput, NoteInputSchema } from "@sharencare/shared";
import { LockIcon } from "lucide-react";
import { type KeyboardEvent, type SubmitEvent, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router";
import { useFeatures } from "../features-query";
import HelpMeWrite from "./HelpMeWrite";

type NoteFormProps = {
  eyebrow: string;
  initial?: NoteInput;
  noteId?: string;
  submitLabel: string;
  isPending: boolean;
  cancelTo: string;
  lockable?: boolean;
  onSubmit: (input: NoteInput) => void;
};

const NoteForm = ({
  eyebrow,
  initial,
  noteId,
  submitLabel,
  isPending,
  cancelTo,
  lockable = false,
  onSubmit,
}: NoteFormProps) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [recipient, setRecipient] = useState(initial?.recipient ?? "");
  const [locked, setLocked] = useState(initial?.locked ?? false);
  const { data: features } = useFeatures();

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = NoteInputSchema.safeParse({ title, description, recipient });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please check your note");
      return;
    }
    onSubmit({ ...result.data, locked });
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

        <div className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
          <label htmlFor="note-recipient" className="text-base-content/50">
            To
          </label>
          <span aria-hidden="true" className="text-base-content/50">
            ·
          </span>
          <input
            id="note-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Just for you"
            maxLength={60}
            autoComplete="off"
            className="w-full bg-transparent uppercase tracking-widest caret-primary outline-none placeholder:text-base-content/30"
          />
        </div>

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

        {features?.aiHelp && !locked && (
          <HelpMeWrite text={description} noteId={noteId} onUse={setDescription} />
        )}

        {lockable ? (
          <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-box border border-base-content/10 p-4">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm mt-0.5"
              checked={locked}
              onChange={(e) => setLocked(e.target.checked)}
            />
            <span>
              <span className="flex items-center gap-2">
                <LockIcon className="size-4 text-primary" />
                Lock with a key
              </span>
              <span className="block text-sm text-base-content/60">
                The words are locked in your browser before they are saved. shareNcare can't read
                them, and neither can anyone without the key. Lose every copy of the key, and nobody
                can open it again.
              </span>
            </span>
          </label>
        ) : (
          locked && (
            <p className="mt-8 flex items-center gap-2 text-sm text-primary">
              <LockIcon className="size-4" />
              Locked with a key. Your changes are locked again before they are saved.
            </p>
          )
        )}

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
