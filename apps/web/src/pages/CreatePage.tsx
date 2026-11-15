import type { NoteInput } from "@sharencare/shared";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import NoteForm from "../components/NoteForm";
import { keepLetterKey } from "../lib/letter-keys";
import { lockWords, newLetterKey } from "../lib/letter-lock";
import { formatPostmark } from "../lib/utils";
import { useCreateNote } from "../note-queries";

const CreatePage = () => {
  const createNote = useCreateNote();
  const navigate = useNavigate();

  const save = async (input: NoteInput) => {
    const key = input.locked ? newLetterKey() : null;
    const toSend = key ? { ...input, description: await lockWords(input.description, key) } : input;

    createNote.mutate(toSend, {
      onSuccess: (note) => {
        toast.success("Your note has been created!");
        if (key && !keepLetterKey(note.id, key)) {
          toast.error("This browser won't keep the key. Copy the key link before you leave");
          navigate(`/note/${note.id}#${key}`);
          return;
        }
        navigate(`/note/${note.id}`);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <NoteForm
        eyebrow={`New note · ${formatPostmark(new Date())}`}
        submitLabel="Save note"
        isPending={createNote.isPending}
        cancelTo="/"
        lockable
        onSubmit={save}
      />
    </div>
  );
};

export default CreatePage;
