import type { ReactNode } from "react";
import { addressedTo } from "../lib/utils";

type EnvelopeProps = {
  icon: ReactNode;
  heading: string;
  recipient: string | null;
  from: string;
  children: ReactNode;
};

const Envelope = ({ icon, heading, recipient, from, children }: EnvelopeProps) => {
  return (
    <section className="card border border-base-content/10 bg-base-200">
      <div className="card-body items-center gap-5 p-8 text-center md:p-14">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          {icon}
        </div>
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">{heading}</h1>
        <div className="max-w-md space-y-5 text-base-content/70">{children}</div>
        <div className="mt-4 flex w-full flex-wrap justify-between gap-2 border-t border-dashed border-base-content/15 pt-5 font-mono text-xs uppercase tracking-widest text-base-content/50">
          <span>{addressedTo(recipient)}</span>
          <span>From · {from}</span>
        </div>
      </div>
    </section>
  );
};

export default Envelope;
