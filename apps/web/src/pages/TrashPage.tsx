import { RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import Loader from "../components/Loader";
import { formatPostmark } from "../lib/utils";
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
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-widest text-base-content/60">
        Nothing here is gone yet
      </p>
      <h1 className="mt-2 mb-10 font-serif text-4xl md:text-5xl">Trash</h1>

      {isPending && <Loader />}

      {error && <p className="text-center text-error">Could not load the trash: {error.message}</p>}

      {trashedNotes && trashedNotes.length === 0 && (
        <p className="py-16 text-center font-mono text-sm text-base-content/50">
          The trash is empty
        </p>
      )}

      <div className="space-y-4">
        {trashedNotes?.map((note) => (
          <div key={note.id} className="card border border-base-content/10 bg-base-200">
            <div className="card-body gap-3 p-6">
              <span className="font-mono text-xs tracking-widest text-base-content/50">
                {note.deletedAt && `MOVED HERE ${formatPostmark(new Date(note.deletedAt))}`}
              </span>
              <h3 className="font-serif text-xl text-base-content/80">{note.title}</h3>
              <p className="line-clamp-2 text-base-content/60">{note.description}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => restoreNote.mutate(note.id)}
                >
                  <RotateCcwIcon className="size-4" />
                  Restore
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
