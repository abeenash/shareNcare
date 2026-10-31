import type { Note } from "../api-client";
import { authClient } from "../auth-client";
import Loader from "../components/Loader";
import NoteCard from "../components/NoteCard";
import NotesNotFound from "../components/NotesNotFound";
import RateLimitUI from "../components/RateLimitUI";
import { greetingFor } from "../lib/utils";
import { ApiError, useNotes } from "../note-queries";

type NoteSectionProps = {
  label: string;
  notes: Note[];
};

const NoteSection = ({ label, notes }: NoteSectionProps) => {
  if (notes.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-4 font-mono text-xs uppercase tracking-widest">
        <h2>{label}</h2>
        <span className="text-base-content/50">{String(notes.length).padStart(2, "0")}</span>
        <div className="h-px flex-1 bg-base-content/10" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
};

const HomePage = () => {
  const { data: notes, isPending, error } = useNotes();
  const { data: session } = authClient.useSession();
  const isRateLimited = error instanceof ApiError && error.status === 429;
  const firstName = session?.user.name.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-6xl">
      <p className="font-mono text-xs uppercase tracking-widest text-base-content/60">
        {greetingFor(new Date())}, {firstName}
      </p>
      <h1 className="mt-2 mb-12 font-serif text-4xl md:text-5xl">
        Your desk <span className="italic text-base-content/50">of letters</span>
      </h1>

      {isRateLimited && <RateLimitUI />}

      {isPending && (
        <div className="py-10">
          <Loader />
        </div>
      )}

      {error && !isRateLimited && (
        <p className="text-center text-error font-mono">Could not load notes: {error.message}</p>
      )}

      {notes && notes.length === 0 && <NotesNotFound />}

      {notes && (
        <>
          <NoteSection label="Pinned" notes={notes.filter((note) => note.pinned)} />
          <NoteSection label="Everything else" notes={notes.filter((note) => !note.pinned)} />
        </>
      )}
    </div>
  );
};

export default HomePage;
