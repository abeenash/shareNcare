import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import type { Note } from "../api-client";
import { useNote } from "../note-queries";
import Loader from "./Loader";

type NoteGateProps = {
  children: (note: Note) => ReactNode;
};

const NoteGate = ({ children }: NoteGateProps) => {
  const { id } = useParams();
  if (!id) return <Navigate to="/" replace />;
  return <LoadNote id={id}>{children}</LoadNote>;
};

const LoadNote = ({ id, children }: NoteGateProps & { id: string }) => {
  const { data: note, isPending, error } = useNote(id);

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-10">
        <p>{error.message}</p>
        <Link to="/" className="btn btn-primary">
          Back to your desk
        </Link>
      </div>
    );
  }
  return children(note);
};

export default NoteGate;
