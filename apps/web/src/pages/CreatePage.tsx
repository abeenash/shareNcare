import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import NoteForm from "../components/NoteForm";
import { formatPostmark } from "../lib/utils";
import { useCreateNote } from "../note-queries";

const CreatePage = () => {
  const createNote = useCreateNote();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl">
      <NoteForm
        eyebrow={`New note · ${formatPostmark(new Date())}`}
        submitLabel="Save note"
        isPending={createNote.isPending}
        cancelTo="/"
        onSubmit={(input) =>
          createNote.mutate(input, {
            onSuccess: (note) => {
              toast.success("Your note has been created!");
              navigate(`/note/${note.id}`);
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </div>
  );
};

export default CreatePage;
