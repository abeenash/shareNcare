import { PinIcon, Trash2Icon } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { Link } from "react-router";
import type { Note } from "../api-client";
import { formatPostmark } from "../lib/utils";
import { useDeleteNote, useTogglePin } from "../note-queries";
import ConfirmModal from "./ConfirmModal";

type NoteCardProps = {
  note: Note;
};

const NoteCard = ({ note }: NoteCardProps) => {
  const deleteNote = useDeleteNote();
  const togglePin = useTogglePin();
  const [confirmingTrash, setConfirmingTrash] = useState(false);

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setConfirmingTrash(true);
  };

  const handlePin = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    togglePin.mutate({ id: note.id, pinned: !note.pinned });
  };

  return (
    <>
      <Link
        to={`/note/${note.id}`}
        className="card border border-base-content/10 bg-base-200 transition-colors hover:border-base-content/25"
      >
        <div className="card-body gap-4 p-7">
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs tracking-widest text-base-content/60">
              {formatPostmark(new Date(note.createdAt))}
            </span>
            <button
              type="button"
              className={`btn btn-ghost btn-xs btn-square ${note.pinned ? "text-primary" : "text-base-content/40"}`}
              onClick={handlePin}
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
            >
              <PinIcon className={`size-4 ${note.pinned ? "fill-current" : ""}`} />
            </button>
          </div>

          <h3 className="font-serif text-2xl leading-snug">{note.title}</h3>
          <p className="line-clamp-3 text-base-content/70">{note.description}</p>

          <div className="mt-2 flex items-center justify-between border-t border-dashed border-base-content/15 pt-4">
            <span className="font-mono text-xs uppercase tracking-widest text-base-content/50">
              Just for you
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error"
              onClick={handleDelete}
              aria-label="Move note to trash"
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
        </div>
      </Link>

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
