import { writingLine } from "../lib/writing-line";

type LiveBadgeProps = { live: boolean; here: number };

const LiveBadge = ({ live, here }: LiveBadgeProps) => (
  <span
    role="status"
    className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-base-content/60"
  >
    <span className={`size-2 rounded-full ${live ? "bg-success" : "bg-base-content/30"}`} />
    {live ? "Live" : "Connecting"}
    {live && here > 1 && <span>· {here} here</span>}
  </span>
);

export const WritingNow = ({ names }: { names: string[] }) => {
  const line = writingLine(names);
  return (
    <p
      aria-live="polite"
      className="flex min-h-6 items-center justify-center gap-2 text-sm text-base-content/60"
    >
      {line && (
        <>
          <span className="loading loading-dots loading-xs" aria-hidden="true" />
          {line}
        </>
      )}
    </p>
  );
};
export default LiveBadge;
