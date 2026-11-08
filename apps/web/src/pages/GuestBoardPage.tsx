import { FlagIcon, LockIcon, MailQuestionIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useDeleteMyNote, useReportNote, useSharedBoard } from "../board-queries";
import ConfirmModal from "../components/ConfirmModal";
import GuestNoteForm from "../components/GuestNoteForm";
import Loader from "../components/Loader";
import Logo from "../components/Logo";
import StickyNote from "../components/StickyNote";
import { guestKeyFor } from "../lib/guest-keys";

const GuestBoard = ({ token }: { token: string }) => {
  const { data: board, isPending, error } = useSharedBoard(token);
  const deleteMine = useDeleteMyNote(token);
  const report = useReportNote(token);
  const [reported, setReported] = useState<string[]>([]);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
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

  const confirmDelete = () => {
    const guestKey = noteToDelete ? guestKeyFor(noteToDelete) : undefined;
    if (noteToDelete && guestKey) deleteMine.mutate({ noteId: noteToDelete, guestKey });
    setNoteToDelete(null);
  };

  const confirmReport = () => {
    if (noteToReport) {
      report.mutate(noteToReport);
      setReported((ids) => [...ids, noteToReport]);
    }
    setNoteToReport(null);
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
          const isMine = guestKeyFor(note.id) !== undefined;
          const wasReported = reported.includes(note.id);
          return (
            <StickyNote
              key={note.id}
              authorName={note.authorName}
              message={note.message}
              color={note.color}
              tilt={index % 2 === 0 ? "left" : "right"}
            >
              {isMine ? (
                <button
                  type="button"
                  className="btn btn-xs border-stone-900/20 bg-white/60 text-stone-900 hover:bg-white"
                  onClick={() => setNoteToDelete(note.id)}
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

      <div className="mx-auto mt-12 max-w-2xl">
        {board.open ? (
          <GuestNoteForm token={token} />
        ) : (
          <div className="card border border-base-content/10 bg-base-200">
            <div className="card-body items-center gap-3 p-8 text-center">
              <LockIcon className="size-6 text-primary" />
              <h2 className="font-serif text-2xl">This board is closed</h2>
              <p className="text-base-content/60">
                {board.from} has stopped taking new notes. You can still read everything here.
              </p>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={noteToDelete !== null}
        title="Delete your note?"
        message="It will be gone from the board for good."
        confirmLabel="Delete my note"
        tone="error"
        onConfirm={confirmDelete}
        onClose={() => setNoteToDelete(null)}
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
          <Link to="/login" className="link link-hover text-primary">
            Start your desk
          </Link>
        </p>
      </div>
    </div>
  );
};

export default GuestBoardPage;
