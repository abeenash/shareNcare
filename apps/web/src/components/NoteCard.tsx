import { PenSquareIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { Link } from "react-router";
import type { Note } from "../api-client";
import { formatDate } from "../lib/utils";
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

  const borderColor = note.pinned ? "border-warning" : "border-[#0077B6]";

  return (
    <>
      <Link
        to={`/note/${note.id}`}
        className={`card bg-base-100 hover:shadow-lg transition-all 
            duration-200 border-t-4 border-solid ${borderColor}`}
      >
        <div className="card-body bg-gray-950 font-mono tracking-wide">
          <h3 className="card-title text-base-content">{note.title}</h3>
          <p className="text-base-content/70 line-clamp-3">{note.description}</p>
          <div className="card-actions justify-between items-center mt-4">
            <span className="text-sm text-base-content/60">
              {formatDate(new Date(note.createdAt))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs text-warning"
                onClick={handlePin}
                aria-label={note.pinned ? "Unpin note" : "Pin note"}
              >
                {note.pinned ? <PinOffIcon className="size-4" /> : <PinIcon className="size-4" />}
              </button>

              <PenSquareIcon className="size-4" />
              <button
                type="button"
                className="btn btn-ghost text-xs text-error"
                onClick={handleDelete}
                aria-label="Move note to trash"
              >
                <Trash2Icon className="size-4" />
              </button>
            </div>
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
