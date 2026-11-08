import type { BoardColor } from "@sharencare/shared";
import type { ReactNode } from "react";

export const STICKY_COLORS: Record<BoardColor, string> = {
  yellow: "bg-amber-200",
  pink: "bg-pink-200",
  blue: "bg-sky-200",
  green: "bg-lime-200",
};

type StickyNoteProps = {
  authorName: string;
  message: string;
  color: BoardColor;
  tilt: "left" | "right";
  faded?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
};

const StickyNote = ({
  authorName,
  message,
  color,
  tilt,
  faded = false,
  badge,
  children,
}: StickyNoteProps) => (
  <article
    className={`flex flex-col gap-4 rounded-sm p-5 text-stone-900 shadow-lg shadow-black/40
    motion-reduce:rotate-0 ${STICKY_COLORS[color]} ${tilt === "left" ? "-rotate-1" : "rotate-1"}
    ${faded ? "opacity-50" : ""}`}
  >
    {badge}
    <p className="whitespace-pre-wrap wrap-break-word font-serif text-lg leading-7">{message}</p>
    <p className="mt-auto font-mono text-xs uppercase tracking-widest text-stone-700">
      From · {authorName}
    </p>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </article>
);

export default StickyNote;
