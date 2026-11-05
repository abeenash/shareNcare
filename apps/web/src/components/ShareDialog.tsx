import { CopyIcon, FlameIcon, LockIcon, SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Note } from "../api-client";
import { formatMoment } from "../lib/utils";
import { useShareNote, useUnshareNote } from "../note-queries";
import SealClock from "./SealClock";

type ShareDialogProps = {
  note: Note;
  open: boolean;
  onClose: () => void;
};

const ShareDialog = ({ note, open, onClose }: ShareDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shareNote = useShareNote(note.id);
  const unshareNote = useUnshareNote(note.id);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealAt, setSealAt] = useState<Date | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const link = note.shareToken ? `${window.location.origin}/s/${note.shareToken}` : null;
  const canSend = "share" in navigator;

  const createLink = () => {
    shareNote.mutate({
      burnAfterReading,
      unsealAt: sealing && sealAt ? sealAt.toISOString() : null,
    });
  };

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const sendLink = () => {
    if (link) navigator.share({ url: link }).catch(() => {});
  };

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box border border-base-content/10 bg-base-200">
        <h3 className="font-serif text-2xl">Share this letter</h3>

        {link ? (
          <>
            <p className="py-4 text-base-content/70">
              Anyone with this link can read it. No account needed.
            </p>
            {note.burnAfterReading && (
              <p className="flex items-center gap-2 pb-2 text-sm text-primary">
                <FlameIcon className="size-4" />
                Burns after one reading, for everyone, including you.
              </p>
            )}
            {note.unsealAt && (
              <p className="flex items-center gap-2 pb-2 text-sm text-primary">
                <LockIcon className="size-4" />
                Sealed until {formatMoment(new Date(note.unsealAt))}.
              </p>
            )}
            <div className="join w-full">
              <input
                readOnly
                value={link}
                aria-label="Share link"
                onFocus={(e) => e.target.select()}
                className="input join-item w-full bg-base-100 font-mono text-xs"
              />
              <button type="button" className="btn btn-primary join-item" onClick={copyLink}>
                <CopyIcon className="size-4" />
                Copy
              </button>
            </div>
            <div className="modal-action justify-between">
              <button
                type="button"
                className="btn btn-ghost text-error"
                disabled={unshareNote.isPending}
                onClick={() => unshareNote.mutate()}
              >
                Stop sharing
              </button>
              <div className="flex gap-2">
                {canSend && (
                  <button type="button" className="btn btn-ghost" onClick={sendLink}>
                    <SendIcon className="size-4" />
                    Send
                  </button>
                )}
                <button type="button" className="btn" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="py-4 text-base-content/70">
              Create a private link to this letter. Only people you give it to can open it, and you
              can switch it off at any time.
            </p>
            <div className="space-y-4 rounded-box border border-base-content/10 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm mt-0.5"
                  checked={burnAfterReading}
                  onChange={(e) => setBurnAfterReading(e.target.checked)}
                />
                <span>
                  <span className="block">Burn after reading</span>
                  <span className="block text-sm text-base-content/60">
                    It can be opened once. Then the words are erased, even from your desk.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm mt-0.5"
                  checked={sealing}
                  onChange={(e) => setSealing(e.target.checked)}
                />
                <span>
                  <span className="block">Seal until a moment</span>
                  <span className="block text-sm text-base-content/60">
                    Nobody can read it before the day and time you choose.
                  </span>
                </span>
              </label>
              {sealing && (
                <>
                  <SealClock onChange={setSealAt} />
                  {sealAt && (
                    <p className="flex items-center justify-center gap-2 text-center text-sm text-primary">
                      <LockIcon className="size-4 shrink-0" />
                      Opens {formatMoment(sealAt)}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={shareNote.isPending}
                onClick={createLink}
              >
                {shareNote.isPending ? "Creating..." : "Create link"}
              </button>
            </div>
          </>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
};

export default ShareDialog;
