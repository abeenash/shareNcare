import { AI_DAILY_SUGGESTIONS, HelpMeWriteSchema } from "@sharencare/shared";
import toast from "react-hot-toast";
import { AiLimitError, useAiQuota, useHelpMeWrite } from "../ai-queries";
import { clockTime } from "../lib/come-back";
import Koinonia from "./Koinonia";

type HelpMeWriteProps = {
  text: string;
  noteId?: string;
  onUse: (suggestion: string) => void;
};

const HelpMeWrite = ({ text, noteId, onUse }: HelpMeWriteProps) => {
  const helpMeWrite = useHelpMeWrite();
  const quota = useAiQuota().data;

  const suggestion = helpMeWrite.data?.suggestion;
  const error = helpMeWrite.error;
  const noneLeft = quota?.remaining === 0 || error instanceof AiLimitError;

  const ask = () => {
    const input = HelpMeWriteSchema.safeParse({ text, noteId });
    if (!input.success) {
      toast.error(input.error.issues[0]?.message ?? "Please check your letter");
      return;
    }
    helpMeWrite.mutate(input.data);
  };

  const use = (words: string) => {
    onUse(words);
    helpMeWrite.reset();
  };

  let count = `${AI_DAILY_SUGGESTIONS} free suggestions a day`;
  if (quota) count = `${quota.remaining} left today`;
  if (quota?.remaining === 0) count += ` · more at ${clockTime(new Date(quota.reset))}`;

  return (
    <section
      aria-label="Help me write"
      className="mt-8 rounded-box border border-primary/20 bg-primary/5 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Koinonia className="size-10 shrink-0" sparks={false} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">Koinonia can help make your words kinder and clearer.</p>
          <p className="font-mono text-xs text-base-content/50">{count}</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-primary btn-sm max-sm:w-full"
          onClick={ask}
          disabled={helpMeWrite.isPending || noneLeft}
        >
          {helpMeWrite.isPending ? "Thinking..." : "Help me write"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-warning">
          {error.message}
          {error instanceof AiLimitError &&
            error.backAt &&
            ` That's ${clockTime(error.backAt)} for you.`}
        </p>
      )}

      {suggestion && (
        <div className="mt-4 rounded-box border border-base-content/10 bg-base-100 p-3 sm:p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-base-content/50">
            Koinonia suggests
          </p>
          <blockquote className="mt-2 whitespace-pre-wrap wrap-break-word text-lg leading-8">
            {suggestion}
          </blockquote>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={helpMeWrite.reset}>
              Keep mine
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => use(suggestion)}
            >
              Use this
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HelpMeWrite;
