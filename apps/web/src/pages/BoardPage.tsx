import {
  ArrowLeftIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router";
import {
  useBoard,
  useDeleteBoard,
  useDeleteBoardNote,
  useLiveBoard,
  useNewBoardLink,
  useSetBoardOpen,
  useSetNoteHidden,
} from "../board-queries";
import ConfirmModal from "../components/ConfirmModal";
import LiveBadge, { WritingNow } from "../components/LiveBadge";
import Loader from "../components/Loader";
import StickyNote from "../components/StickyNote";

const BoardPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: board, isPending, error } = useBoard(id);
  const live = useLiveBoard(error ? undefined : board?.token);
  const setOpen = useSetBoardOpen(id);
  const newLink = useNewBoardLink(id);
  const deleteBoard = useDeleteBoard();
  const setHidden = useSetNoteHidden(id);
  const deleteNote = useDeleteBoardNote(id);
  const [confirming, setConfirming] = useState<"new-link" | "delete-board" | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [switchedTo, setSwitchedTo] = useState<boolean | null>(null);

  if (isPending) return <Loader />;
  if (error) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-3xl">This board isn't here</h1>
        <Link to="/boards" className="btn btn-ghost mt-6">
          Back to your boards
        </Link>
      </div>
    );
  }

  const link = `${window.location.origin}/b/${board.token}`;
  const isOpen = switchedTo ?? board.closedAt === null;

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/boards" className="btn btn-ghost btn-sm -ml-3 mb-6">
        <ArrowLeftIcon className="size-4" />
        Your boards
      </Link>
      <p className="font-mono text-xs uppercase tracking-widest text-base-content/60">
        For · {board.recipient}
      </p>
      <h1 className="mt-2 mb-8 font-serif text-4xl md:text-5xl">{board.title}</h1>

      <section className="card mb-10 border border-base-content/10 bg-base-200">
        <div className="card-body gap-4 p-6">
          <p className="text-base-content/70">
            Anyone with this link can read the board. People who sign in can add one note each.
          </p>
          <div className="join w-full">
            <input
              readOnly
              value={link}
              aria-label="Board link"
              onFocus={(e) => e.target.select()}
              className="input join-item w-full bg-base-100 font-mono text-xs"
            />
            <button type="button" className="btn btn-primary join-item" onClick={copyLink}>
              <CopyIcon className="size-4" />
              Copy
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={isOpen}
                disabled={setOpen.isPending}
                onChange={(e) => {
                  const open = e.target.checked;
                  setSwitchedTo(open);
                  setOpen.mutate(open, { onSettled: () => setSwitchedTo(null) });
                }}
              />
              Taking new notes
            </label>
            <Link to={`/b/${board.token}`} className="btn btn-ghost btn-sm ml-auto">
              Open the board
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming("new-link")}
            >
              <RefreshCwIcon className="size-4" />
              New link
            </button>
          </div>
        </div>
      </section>

      <div className="mb-5 flex items-center gap-4 font-mono text-xs uppercase tracking-widest">
        <h2>Notes</h2>
        <span className="text-base-content/50">{String(board.notes.length).padStart(2, "0")}</span>
        <div className="h-px flex-1 bg-base-content/10" />
        <LiveBadge live={live.live} here={live.here} />
      </div>

      {board.notes.length === 0 && (
        <p className="py-10 text-center font-mono text-sm text-base-content/50">
          No notes yet. Share the link to get the first one.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {board.notes.map((note, index) => {
          const hidden = note.hiddenAt !== null;
          return (
            <StickyNote
              key={note.id}
              authorName={note.authorName}
              message={note.message}
              color={note.color}
              tilt={index % 2 === 0 ? "left" : "right"}
              faded={hidden}
              badge={
                (hidden || note.reportCount > 0) && (
                  <p className="font-mono text-xs uppercase tracking-widest text-red-800">
                    {hidden ? "Hidden from guests" : ""}
                    {hidden && note.reportCount > 0 ? " · " : ""}
                    {note.reportCount > 0 &&
                      `${note.reportCount} ${note.reportCount === 1 ? "report" : "reports"}`}
                  </p>
                )
              }
            >
              <button
                type="button"
                className="btn btn-xs border-stone-900/20 bg-white/60 text-stone-900 hover:bg-white"
                disabled={setHidden.isPending}
                onClick={() => setHidden.mutate({ noteId: note.id, hidden: !hidden })}
              >
                {hidden ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
                {hidden ? "Show again" : "Hide"}
              </button>
              <button
                type="button"
                className="btn btn-xs border-stone-900/20 bg-white/60 text-red-800 hover:bg-white"
                onClick={() => setNoteToDelete(note.id)}
              >
                <Trash2Icon className="size-3.5" />
                Delete
              </button>
            </StickyNote>
          );
        })}
      </div>

      <div className="mt-8">
        <WritingNow names={live.writers} />
      </div>

      <div className="mt-16 border-t border-dashed border-base-content/15 pt-6">
        <button
          type="button"
          className="btn btn-error btn-outline btn-sm"
          onClick={() => setConfirming("delete-board")}
        >
          <Trash2Icon className="size-4" />
          Delete this board
        </button>
      </div>

      <ConfirmModal
        open={confirming === "new-link"}
        title="Make a new link?"
        message="The old link stops working at once. Anyone who should still write will need the new one."
        confirmLabel="New link"
        tone="warning"
        onConfirm={() => {
          setConfirming(null);
          newLink.mutate();
        }}
        onClose={() => setConfirming(null)}
      />
      <ConfirmModal
        open={confirming === "delete-board"}
        title="Delete this board?"
        message="The board and every note on it will be gone for good. This cannot be undone."
        confirmLabel="Delete board"
        tone="error"
        onConfirm={() => {
          setConfirming(null);
          deleteBoard.mutate(id, { onSuccess: () => navigate("/boards") });
        }}
        onClose={() => setConfirming(null)}
      />
      <ConfirmModal
        open={noteToDelete !== null}
        title="Delete this note?"
        message="It will be gone for good. This cannot be undone."
        confirmLabel="Delete note"
        tone="error"
        onConfirm={() => {
          if (noteToDelete) deleteNote.mutate(noteToDelete);
          setNoteToDelete(null);
        }}
        onClose={() => setNoteToDelete(null)}
      />
    </div>
  );
};

export default BoardPage;
