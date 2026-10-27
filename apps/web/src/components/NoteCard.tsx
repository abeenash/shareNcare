import { PenSquareIcon, Trash2Icon } from "lucide-react";
import type { MouseEvent } from "react";
import { Link } from "react-router";
import type { Note } from "../api-client";
import { formatDate } from "../lib/utils";
import { useDeleteNote } from "../note-queries";

type NoteCardProps = {
  note: Note;
};

const NoteCard = ({ note }: NoteCardProps) => {
  const deleteNote = useDeleteNote();

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    deleteNote.mutate(note.id);
  };

  return (
    <Link
      to={`/note/${note.id}`}
      className="card bg-base-100 hover:shadow-lg transition-all 
            duration-200 border-t-4 border-solid border-[#0077B6]"
    >
      <div className="card-body bg-gray-950 font-mono tracking-wide">
        <h3 className="card-title text-base-content">{note.title}</h3>
        <p className="text-base-content/70 line-clamp-3">{note.description}</p>
        <div className="card-actions justify-between items-center mt-4">
          <span className="text-sm text-base-content/60">
            {formatDate(new Date(note.createdAt))}
          </span>
          <div className="flex items-center gap-2">
            <PenSquareIcon className="size-4" />
            <button
              type="button"
              className="btn btn-ghost text-xs text-error"
              onClick={handleDelete}
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NoteCard;
