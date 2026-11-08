import { Link } from "react-router";
import { useBoards } from "../board-queries";
import Loader from "../components/Loader";
import NewBoardForm from "../components/NewBoardForm";
import { formatPostmark } from "../lib/utils";

const BoardsPage = () => {
  const { data: boards, isPending, error } = useBoards();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-xs uppercase tracking-widest text-base-content/60">
        Many hands, one board
      </p>
      <h1 className="mt-2 mb-4 font-serif text-4xl md:text-5xl">Care boards</h1>
      <p className="mb-10 max-w-2xl text-base-content/70">
        Make a board for someone, share one link, and everyone adds a note. No accounts needed for
        the people writing.
      </p>

      <NewBoardForm />

      <div className="mt-12 mb-5 flex items-center gap-4 font-mono text-xs uppercase tracking-widest">
        <h2>Your boards</h2>
        <div className="h-px flex-1 bg-base-content/10" />
      </div>

      {isPending && <Loader />}
      {error && <p className="text-center text-error">Could not load boards: {error.message}</p>}
      {boards && boards.length === 0 && (
        <p className="py-10 text-center font-mono text-sm text-base-content/50">No boards yet</p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {boards?.map((board) => (
          <article
            key={board.id}
            className="card relative border border-base-content/10 bg-base-200 transition-colors hover:border-base-content/25"
          >
            <div className="card-body gap-3 p-6">
              <span className="font-mono text-xs tracking-widest text-base-content/60">
                {formatPostmark(new Date(board.createdAt))}
                {board.closedAt && " · CLOSED"}
              </span>
              <h3 className="font-serif text-2xl leading-snug">
                <Link
                  to={`/boards/${board.id}`}
                  className="outline-none after:absolute after:inset-0 after:rounded-box"
                >
                  {board.title}
                </Link>
              </h3>
              <p className="font-mono text-xs uppercase tracking-widest text-base-content/50">
                For · {board.recipient} · {board.noteCount}{" "}
                {board.noteCount === 1 ? "note" : "notes"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default BoardsPage;
