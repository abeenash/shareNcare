import { FlameIcon, LockIcon, PencilLineIcon, PinIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { Note } from "../api-client";
import { addressedTo, formatPostmark } from "../lib/utils";
import { useDeleteNote, useTogglePin } from "../note-queries";
import ConfirmModal from "./ConfirmModal";
import RichText from "./RichText";

type NoteCardProps = {
  note: Note;
};

const NoteCard = ({ note }: NoteCardProps) => {
  const deleteNote = useDeleteNote();
  const togglePin = useTogglePin();
  const [confirmingTrash, setConfirmingTrash] = useState(false);

  return (
    <>
      <article
        className="card relative border border-base-content/10 bg-base-200 
      transition-colors hover:border-base-content/25 has-[a:focus-visible]:border-primary/60"
      >
        <div className="card-body gap-4 p-7">
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs tracking-widest text-base-content/60">
              {formatPostmark(new Date(note.createdAt))}
            </span>
            <button
              type="button"
              className={`btn btn-ghost btn-xs btn-square relative z-10 ${note.pinned ? "text-primary" : "text-base-content/40"}`}
              onClick={() => togglePin.mutate({ id: note.id, pinned: !note.pinned })}
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
            >
              <PinIcon className={`size-4 ${note.pinned ? "fill-current" : ""}`} />
            </button>
          </div>

          <h3 className="font-serif text-2xl leading-snug">
            <Link
              to={`/note/${note.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-box"
            >
              {note.title}
            </Link>
          </h3>
          <p className="line-clamp-3 text-base-content/70">
            {note.burnedAt ? (
              <span className="italic">The words are gone.</span>
            ) : (
              <RichText text={note.description} />
            )}
          </p>

          <div className="mt-2 flex items-center justify-between border-t border-dashed border-base-content/15 pt-4">
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-base-content/50">
              {note.burnedAt
                ? `Burned · ${formatPostmark(new Date(note.burnedAt))}`
                : addressedTo(note.recipient)}
              {note.burnAfterReading && (
                <FlameIcon className="size-3.5 text-primary" aria-label="Burns after reading" />
              )}
              {note.unsealAt && !note.burnedAt && (
                <LockIcon className="size-3.5 text-primary" aria-label="Sealed" />
              )}
            </span>
            <div className="relative z-10 flex items-center gap-1">
              {!note.burnedAt && (
                <Link
                  to={`/note/${note.id}/edit`}
                  className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content"
                  aria-label="Edit note"
                >
                  <PencilLineIcon className="size-4" />
                </Link>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error"
                onClick={() => setConfirmingTrash(true)}
                aria-label="Move note to trash"
              >
                <Trash2Icon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </article>

      <ConfirmModal
        open={confirmingTrash}
        title="Move to trash?"
        message={`"${note.title}" will move to the trash. You can restore it from there.`}
        confirmLabel="Move to trash"
        tone="warning"
        onConfirm={() => {
          setConfirmingTrash(false);
          deleteNote.mutate(note.id);
        }}
        onClose={() => setConfirmingTrash(false)}
      />
    </>
  );
};

export default NoteCard;
