import { toast } from "react-hot-toast";
import { useNavigate } from "react-router";
import type { Note } from "../api-client";
import NoteForm from "../components/NoteForm";
import NoteGate from "../components/NoteGate";
import { formatPostmark } from "../lib/utils";
import { useUpdateNote } from "../note-queries";

const NoteEditPage = () => <NoteGate>{(note) => <EditNote key={note.id} note={note} />}</NoteGate>;

const EditNote = ({ note }: { note: Note }) => {
  const updateNote = useUpdateNote(note.id);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl">
      <NoteForm
        eyebrow={`Editing · ${formatPostmark(new Date(note.createdAt))}`}
        initial={note}
        submitLabel="Save changes"
        isPending={updateNote.isPending}
        cancelTo={`/note/${note.id}`}
        onSubmit={(input) =>
          updateNote.mutate(input, {
            onSuccess: () => {
              toast.success("Your note has been updated");
              navigate(`/note/${note.id}`);
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </div>
  );
};

export default NoteEditPage;
