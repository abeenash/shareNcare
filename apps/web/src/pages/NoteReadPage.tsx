import {
  ArrowLeftIcon,
  ImagePlusIcon,
  KeyRoundIcon,
  Link2Icon,
  PencilLineIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router";
import type { Note } from "../api-client";
import ConfirmModal from "../components/ConfirmModal";
import Letter from "../components/Letter";
import NoteGate from "../components/NoteGate";
import ShareDialog from "../components/ShareDialog";
import { keyFromLink } from "../lib/key-from-link";
import { keepLetterKey, letterKeyFor } from "../lib/letter-keys";
import { addressedTo, formatPostmark } from "../lib/utils";
import {
  useAddPhoto,
  useDeleteNote,
  useNotePhoto,
  useRemovePhoto,
  useUnlockedWords,
} from "../note-queries";

const NoteReadPage = () => <NoteGate>{(note) => <ReadNote note={note} />}</NoteGate>;

const ReadNote = ({ note }: { note: Note }) => {
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [sharing, setSharing] = useState(false);
  const deleteNote = useDeleteNote();
  const addPhoto = useAddPhoto(note.id);
  const removePhoto = useRemovePhoto(note.id);
  const photo = useNotePhoto(note);
  const navigate = useNavigate();

  // A locked letter's key: from a key link just opened here, or from this browser.
  const { hash } = useLocation();
  const keyInLink = note.locked ? keyFromLink(hash) : null;
  const key = keyInLink ?? (note.locked ? letterKeyFor(note.id) : null);
  const unlocked = useUnlockedWords(
    note.locked && !note.burnedAt ? note.description : undefined,
    key,
  );

  // A key link that really opens this letter is kept, and taken out of the address bar.
  useEffect(() => {
    if (keyInLink && unlocked.isSuccess && keepLetterKey(note.id, keyInLink)) {
      navigate({ hash: "" }, { replace: true });
    }
  }, [keyInLink, unlocked.isSuccess, note.id, navigate]);

  const copyKeyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/note/${note.id}#${key}`);
    toast.success("Key link copied. Keep it somewhere safe.");
  };

  const lockedMessage = () => {
    if (!key) {
      return "This letter is locked, and this browser doesn't have its key. Open its key link here to read it.";
    }
    if (unlocked.isError) {
      return keyInLink
        ? "That key link doesn't open this letter."
        : "The key kept in this browser doesn't open this letter.";
    }
    return "Unlocking...";
  };

  const body = () => {
    if (note.burnedAt) {
      return `This letter was opened and burned on ${formatPostmark(new Date(note.burnedAt))}. Its words are gone, even from here.`;
    }
    if (!note.locked) return note.description;
    return unlocked.data ?? lockedMessage();
  };

  const handleTrash = () => {
    setConfirmingTrash(false);
    deleteNote.mutate(note.id);
    navigate("/");
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-y-2">
        <Link to="/" className="btn btn-ghost btn-sm">
          <ArrowLeftIcon className="size-4" />
          Your desk
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {!note.burnedAt && (
            <>
              {unlocked.isSuccess && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={copyKeyLink}>
                  <KeyRoundIcon className="size-4" />
                  Key link
                </button>
              )}
              {!note.photoKey && !note.locked && (
                <label
                  className={`btn btn-ghost btn-sm ${addPhoto.isPending ? "btn-disabled" : ""}`}
                >
                  <ImagePlusIcon className="size-4" />
                  {addPhoto.isPending ? "Adding..." : "Add photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={addPhoto.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) addPhoto.mutate(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${note.shareToken ? "text-primary" : ""}`}
                onClick={() => setSharing(true)}
              >
                <Link2Icon className="size-4" />
                {note.shareToken ? "Shared" : "Share"}
              </button>
              {(!note.locked || unlocked.isSuccess) && (
                <Link to={`/note/${note.id}/edit`} className="btn btn-ghost btn-sm">
                  <PencilLineIcon className="size-4" />
                  Edit
                </Link>
              )}
            </>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-error"
            onClick={() => setConfirmingTrash(true)}
            aria-label="Move note to trash"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      <Letter
        date={new Date(note.createdAt)}
        title={note.title}
        photoUrl={note.photoKey ? photo.data?.url : null}
        photoAction={
          !note.burnedAt && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-base-content/60"
              disabled={removePhoto.isPending}
              onClick={() => removePhoto.mutate()}
            >
              Remove photo
            </button>
          )
        }
        body={body()}
        footer={
          <span className="font-mono text-xs uppercase tracking-widest text-base-content/50">
            {addressedTo(note.recipient)}
          </span>
        }
      />

      <ShareDialog note={note} open={sharing} onClose={() => setSharing(false)} />

      <ConfirmModal
        open={confirmingTrash}
        title="Move to trash?"
        message={`"${note.title}" will move to the trash. You can restore it from there.`}
        confirmLabel="Move to trash"
        tone="warning"
        onConfirm={handleTrash}
        onClose={() => setConfirmingTrash(false)}
      />
    </div>
  );
};

export default NoteReadPage;
