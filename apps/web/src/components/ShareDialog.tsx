import { CopyIcon, SendIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type { Note } from "../api-client";
import { useShareNote, useUnshareNote } from "../note-queries";

type ShareDialogProps = {
  note: Note;
  open: boolean;
  onClose: () => void;
};

const ShareDialog = ({ note, open, onClose }: ShareDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shareNote = useShareNote(note.id);
  const unshareNote = useUnshareNote(note.id);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const link = note.shareToken ? `${window.location.origin}/s/${note.shareToken}` : null;
  const canSend = "share" in navigator;

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
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={shareNote.isPending}
                onClick={() => shareNote.mutate()}
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
