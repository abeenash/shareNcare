import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import NoteCard from "../components/NoteCard";
import NotesNotFound from "../components/NotesNotFound";
import RateLimitUI from "../components/RateLimitUI";
import { ApiError, useNotes } from "../note-queries";

const HomePage = () => {
  const { data: notes, isPending, error } = useNotes();
  const isRateLimited = error instanceof ApiError && error.status === 429;

  return (
    <div className="min-h-screen">
      <Navbar />
      {isRateLimited && <RateLimitUI />}

      <div className="max-w-7xl mx-auto p-4 mt-6">
        {isPending && (
          <div className="text-center text-primary py-10">
            <Loader />
          </div>
        )}

        {error && !isRateLimited && (
          <p className="text-center text-error font-mono">Could not load notes: {error.message}</p>
        )}

        {notes && notes.length === 0 && <NotesNotFound />}

        {notes && notes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <div key={note.id}>
                <NoteCard key={note.id} note={note} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
