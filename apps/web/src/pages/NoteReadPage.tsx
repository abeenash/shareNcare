import { ArrowLeftIcon, Link2Icon, PencilLineIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Note } from "../api-client";
import ConfirmModal from "../components/ConfirmModal";
import Letter from "../components/Letter";
import NoteGate from "../components/NoteGate";
import ShareDialog from "../components/ShareDialog";
import { addressedTo } from "../lib/utils";
import { useDeleteNote } from "../note-queries";

const NoteReadPage = () => <NoteGate>{(note) => <ReadNote note={note} />}</NoteGate>;

const ReadNote = ({ note }: { note: Note }) => {
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [sharing, setSharing] = useState(false);
  const deleteNote = useDeleteNote();
  const navigate = useNavigate();

  const handleTrash = () => {
    setConfirmingTrash(false);
    deleteNote.mutate(note.id);
    navigate("/");
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="btn btn-ghost btn-sm">
          <ArrowLeftIcon className="size-4" />
          Your desk
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${note.shareToken ? "text-primary" : ""}`}
            onClick={() => setSharing(true)}
          >
            <Link2Icon className="size-4" />
            {note.shareToken ? "Shared" : "Share"}
          </button>
          <Link to={`/note/${note.id}/edit`} className="btn btn-ghost btn-sm">
            <PencilLineIcon className="size-4" />
            Edit
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-error"
            onClick={() => setConfirmingTrash(true)}
            aria-label="Move note to trash"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      <Letter
        date={new Date(note.createdAt)}
        title={note.title}
        body={note.description}
        footer={
          <span className="font-mono text-xs uppercase tracking-widest text-base-content/50">
            {addressedTo(note.recipient)}
          </span>
        }
      />

      <ShareDialog note={note} open={sharing} onClose={() => setSharing(false)} />

      <ConfirmModal
        open={confirmingTrash}
        title="Move to trash?"
        message={`"${note.title}" will move to the trash. You can restore it from there.`}
        confirmLabel="Move to trash"
        tone="warning"
        onConfirm={handleTrash}
        onClose={() => setConfirmingTrash(false)}
      />
    </div>
  );
};

export default NoteReadPage;
