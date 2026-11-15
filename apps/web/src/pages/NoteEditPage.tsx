import type { NoteInput } from "@sharencare/shared";
import { toast } from "react-hot-toast";
import { Navigate, useNavigate } from "react-router";
import type { Note } from "../api-client";
import Loader from "../components/Loader";
import NoteForm from "../components/NoteForm";
import NoteGate from "../components/NoteGate";
import { letterKeyFor } from "../lib/letter-keys";
import { lockWords } from "../lib/letter-lock";
import { formatPostmark } from "../lib/utils";
import { useUnlockedWords, useUpdateNote } from "../note-queries";

const NoteEditPage = () => <NoteGate>{(note) => <EditNote key={note.id} note={note} />}</NoteGate>;

const EditNote = ({ note }: { note: Note }) => {
  const key = note.locked ? letterKeyFor(note.id) : null;
  const unlocked = useUnlockedWords(note.locked ? note.description : undefined, key);
  const updateNote = useUpdateNote(note.id);
  const navigate = useNavigate();

  if (note.burnedAt) return <Navigate to={`/note/${note.id}`} replace />;
  if (note.locked && (!key || unlocked.isError))
    return <Navigate to={`/note/${note.id}`} replace />;
  if (note.locked && !unlocked.data) return <Loader />;

  const save = async (input: NoteInput) => {
    const toSend = key ? { ...input, description: await lockWords(input.description, key) } : input;
    updateNote.mutate(toSend, {
      onSuccess: () => {
        toast.success("Your note has been updated");
        navigate(`/note/${note.id}`);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <NoteForm
        eyebrow={`Editing · ${formatPostmark(new Date(note.createdAt))}`}
        initial={{ ...note, description: unlocked.data ?? note.description }}
        submitLabel="Save changes"
        isPending={updateNote.isPending}
        cancelTo={`/note/${note.id}`}
        onSubmit={save}
      />
    </div>
  );
};

export default NoteEditPage;
