import { ArrowLeftIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import ConfirmModal from "../components/ConfirmModal";
import Loader from "../components/Loader";
import { formatDate } from "../lib/utils";
import { usePurgeNote, useRestoreNote, useTrash } from "../note-queries";

const TrashPage = () => {
  const { data: trashedNotes, isPending, error } = useTrash();
  const restoreNote = useRestoreNote();
  const purgeNote = usePurgeNote();
  const [noteToPurge, setNoteToPurge] = useState<string | null>(null);

  const handlePurge = () => {
    if (noteToPurge) purgeNote.mutate(noteToPurge);
    setNoteToPurge(null);
  };
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-4 mt-6 font-mono tracking-wide">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="btn btn-ghost">
            <ArrowLeftIcon className="size-5" />
            Back to Notes
          </Link>
          <h2 className="text-2xl font-bold">Trash</h2>
        </div>

        {isPending && <Loader />}

        {error && (
          <p className="text-center text-error">Could not load the trash: {error.message}</p>
        )}

        {trashedNotes && trashedNotes.length === 0 && (
          <p className="text-center text-base-content/60 py-16">The trash is empty</p>
        )}

        <div className="space-y-4">
          {trashedNotes?.map((note) => (
            <div key={note.id} className="card bg-gray-950 border-t-4 border-base-content/20">
              <div className="card-body">
                <h3 className="card-title text-base-content/80">{note.title}</h3>
                <p className="text-base-content/60 line-clamp-2">{note.description}</p>
                <div className="card-actions justify-between items-center mt-2">
                  <span className="text-sm text-base-content/50">
                    {note.deletedAt && `Deleted ${formatDate(new Date(note.deletedAt))}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => restoreNote.mutate(note.id)}
                  >
                    <RotateCcwIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-error btn-outline"
                    onClick={() => setNoteToPurge(note.id)}
                  >
                    <Trash2Icon className="size-4" />
                    Delete forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ConfirmModal
        open={noteToPurge !== null}
        title="Delete forever?"
        message="This note will be gone for good. This cannot be undone."
        confirmLabel="Delete forever"
        tone="error"
        onConfirm={handlePurge}
        onClose={() => setNoteToPurge(null)}
      />
    </div>
  );
};

export default TrashPage;
