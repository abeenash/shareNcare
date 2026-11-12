import {
  EyeOffIcon,
  FlagIcon,
  LockIcon,
  MailQuestionIcon,
  PenLineIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useDeleteMyNote, useReportNote, useSharedBoard } from "../board-queries";
import ConfirmModal from "../components/ConfirmModal";
import GuestNoteForm from "../components/GuestNoteForm";
import Loader from "../components/Loader";
import Logo from "../components/Logo";
import StickyNote from "../components/StickyNote";

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="card border border-base-content/10 bg-base-200">
    <div className="card-body items-center gap-3 p-8 text-center">{children}</div>
  </div>
);

const GuestBoard = ({ token }: { token: string }) => {
  const { data: board, isPending, error } = useSharedBoard(token);
  const deleteMine = useDeleteMyNote(token);
  const report = useReportNote(token);
  const [reported, setReported] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [noteToReport, setNoteToReport] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <MailQuestionIcon className="size-10 text-primary" />
        <h1 className="font-serif text-3xl">This board isn't here</h1>
        <p className="max-w-sm text-base-content/60">
          The link may be mistyped, or the person who made the board changed or deleted it.
        </p>
      </div>
    );
  }

  // After signing in, come straight back to this board.
  const signInLink = `/login?next=${encodeURIComponent(`/b/${token}`)}`;
  const yourNote = board.yourNote;

  const confirmDelete = () => {
    if (yourNote) deleteMine.mutate(yourNote.id);
    setConfirmingDelete(false);
  };

  const confirmReport = () => {
    if (noteToReport) {
      report.mutate(noteToReport);
      setReported((ids) => [...ids, noteToReport]);
    }
    setNoteToReport(null);
  };

  // What goes under the notes depends on who is looking.
  const writeArea = () => {
    if (!board.open) {
      return (
        <Card>
          <LockIcon className="size-6 text-primary" />
          <h2 className="font-serif text-2xl">This board is closed</h2>
          <p className="text-base-content/60">
            {board.from} has stopped taking new notes. You can still read everything here.
          </p>
        </Card>
      );
    }
    if (!board.signedIn) {
      return (
        <Card>
          <PenLineIcon className="size-6 text-primary" />
          <h2 className="font-serif text-2xl">Add your note for {board.recipient}</h2>
          <p className="max-w-md text-base-content/70">
            Sign in or create a free account to write. Your first name goes on your note, so{" "}
            {board.recipient} knows it is really from you. It takes less than a minute.
          </p>
          <Link to={signInLink} className="btn btn-primary mt-2">
            Sign in to write a note
          </Link>
          <p className="text-xs text-base-content/50">
            Reading stays open to everyone with the link.
          </p>
        </Card>
      );
    }
    if (yourNote?.hidden) {
      return (
        <Card>
          <EyeOffIcon className="size-6 text-primary" />
          <h2 className="font-serif text-2xl">Your note is hidden for now</h2>
          <p className="max-w-md text-base-content/60">
            People reported it, so it is waiting for {board.from} to look at it. You can delete it
            and write a new one.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2Icon className="size-4" />
            Delete my note
          </button>
        </Card>
      );
    }
    if (yourNote) {
      return (
        <Card>
          <h2 className="font-serif text-2xl">Your note is on the board</h2>
          <p className="text-base-content/60">
            Everyone writes one note. To change yours, delete it and write a new one.
          </p>
        </Card>
      );
    }
    return <GuestNoteForm token={token} />;
  };

  return (
    <>
      <header className="mb-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-base-content/60">
          A care board · from {board.from}
        </p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">{board.title}</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-primary">
          For · {board.recipient}
        </p>
      </header>

      {board.notes.length === 0 && (
        <p className="py-6 text-center font-mono text-sm text-base-content/50">
          No notes yet. Be the first.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {board.notes.map((note, index) => {
          const wasReported = reported.includes(note.id);
          return (
            <StickyNote
              key={note.id}
              authorName={note.authorName}
              message={note.message}
              color={note.color}
              tilt={index % 2 === 0 ? "left" : "right"}
            >
              {note.mine ? (
                <button
                  type="button"
                  className="btn btn-xs border-stone-900/20 bg-white/60 text-stone-900 hover:bg-white"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2Icon className="size-3.5" />
                  Delete my note
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs ml-auto text-stone-700 hover:bg-white/50"
                  disabled={wasReported}
                  onClick={() => setNoteToReport(note.id)}
                >
                  <FlagIcon className="size-3.5" />
                  {wasReported ? "Reported" : "Report"}
                </button>
              )}
            </StickyNote>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-2xl">{writeArea()}</div>

      <ConfirmModal
        open={confirmingDelete}
        title="Delete your note?"
        message="It will be gone from the board for good. You can write a new one afterwards."
        confirmLabel="Delete my note"
        tone="error"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(false)}
      />
      <ConfirmModal
        open={noteToReport !== null}
        title="Report this note?"
        message="If a few people report it, it is hidden until the person who made the board looks at it."
        confirmLabel="Report"
        tone="warning"
        onConfirm={confirmReport}
        onClose={() => setNoteToReport(null)}
      />
    </>
  );
};

const GuestBoardPage = () => {
  const { token = "" } = useParams();

  return (
    <div className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        <GuestBoard token={token} />

        <p className="mt-12 text-center text-sm text-base-content/50">
          Want to make one for someone?{" "}
          <Link to="/boards" className="link link-hover text-primary">
            Start a care board
          </Link>
        </p>
      </div>
    </div>
  );
};

export default GuestBoardPage;
