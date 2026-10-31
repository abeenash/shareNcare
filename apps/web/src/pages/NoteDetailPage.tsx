import { NoteInputSchema } from "@sharencare/shared";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import type { Note } from "../api-client";
import ConfirmModal from "../components/ConfirmModal";
import Loader from "../components/Loader";
import { useDeleteNote, useNote, useUpdateNote } from "../note-queries";

const NoteDetailPage = () => {
  const { id } = useParams();
  if (!id) return <Navigate to="/" replace />;
  return <NoteDetail id={id} />;
};

const NoteDetail = ({ id }: { id: string }) => {
  const { data: note, isPending, error } = useNote(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col items-center justify-center gap-4">
        <p>{error.message}</p>
        <Link to="/" className="btn btn-primary">
          Back to Notes
        </Link>
      </div>
    );
  }

  return <EditNoteForm key={note.id} note={note} />;
};

const EditNoteForm = ({ note }: { note: Note }) => {
  const [title, setTitle] = useState(note.title);
  const [description, setDescription] = useState(note.description);
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const updateNote = useUpdateNote(note.id);
  const deleteNote = useDeleteNote();
  const navigate = useNavigate();

  const handleSave = async () => {
    const result = NoteInputSchema.safeParse({ title, description });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please check your note");
      return;
    }

    updateNote.mutate(result.data, {
      onSuccess: () => {
        toast.success("Your note has been updated");
        navigate("/");
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDelete = () => {
    setConfirmingTrash(false);
    deleteNote.mutate(note.id);
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="w-full">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to={"/"} className="btn btn-ghost">
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Notes
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-outline btn-error"
              onClick={() => setConfirmingTrash(true)}
            >
              <Trash2Icon className="h-5 w-5" />
            </button>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <div className="form-control mb-4">
                <label className="label" htmlFor="title">
                  <span className="text-base-content/70">Title</span>
                </label>
                <input
                  type="text"
                  placeholder="Note title"
                  className="block mt-1 input bg-base-100 input-bordered rounded-xl"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label" htmlFor="description">
                  <span className="text-base-content/70">Description</span>
                </label>
                <textarea
                  placeholder="Write your note here..."
                  className="block mt-1 bg-base-100 rounded-2xl textarea textarea-bordered h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="card-actions justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={updateNote.isPending}
                  onClick={handleSave}
                >
                  {updateNote.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={confirmingTrash}
        title="Move to trash?"
        message="This note will move to the trash. You can restore it from there."
        confirmLabel="Move to trash"
        tone="warning"
        onConfirm={handleDelete}
        onClose={() => setConfirmingTrash(false)}
      />
    </div>
  );
};

export default NoteDetailPage;
