import type { ReactNode } from "react";
import { formatPostmark } from "../lib/utils";
import RichText from "./RichText";

type LetterProps = {
  date: Date;
  title: string;
  body: string;
  footer: ReactNode;
};

const Letter = ({ date, title, body, footer }: LetterProps) => {
  return (
    <article className="card border border-base-content/10 bg-base-200">
      <div className="card-body gap-0 p-7 md:p-12">
        <span className="font-mono text-xs tracking-widest text-base-content/60">
          {formatPostmark(date)}
        </span>
        <h1 className="mt-4 font-serif text-3xl leading-tight md:text-4xl">{title}</h1>
        <div className="my-8 border-t border-dashed border-base-content/15" />
        <p className="whitespace-pre-wrap wrap-break-word text-lg leading-8 text-base-content/85">
          <RichText text={body} />
        </p>
        <div className="mt-10 border-t border-dashed border-base-content/15 pt-5">{footer}</div>
      </div>
    </article>
  );
};

export default Letter;
