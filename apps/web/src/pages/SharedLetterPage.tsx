import { FlameIcon, LockIcon, MailQuestionIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import BurningLetter from "../components/BurningLetter";
import Envelope from "../components/Envelope";
import Letter from "../components/Letter";
import Loader from "../components/Loader";
import Logo from "../components/Logo";
import { addressedTo, formatMoment, formatPostmark } from "../lib/utils";
import { useOpenLetter, useSharedLetter } from "../note-queries";

const LetterFooter = ({ recipient, from }: { recipient: string | null; from: string }) => (
  <div className="flex flex-wrap justify-between gap-2 font-mono text-xs uppercase tracking-widest text-base-content/50">
    <span>{addressedTo(recipient)}</span>
    <span>From · {from}</span>
  </div>
);

const SharedLetter = ({ token }: { token: string }) => {
  const { data: letter, isPending, error } = useSharedLetter(token);
  const openLetter = useOpenLetter(token);
  const [burnedHere, setBurnedHere] = useState(false);

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <MailQuestionIcon className="size-10 text-primary" />
        <h1 className="font-serif text-3xl">This letter isn't here</h1>
        <p className="max-w-sm text-base-content/60">
          The link may be mistyped, or the person who wrote it stopped sharing it.
        </p>
      </div>
    );
  }

  const envelope = { recipient: letter.recipient, from: letter.from };

  if (burnedHere) {
    return (
      <Envelope icon={<FlameIcon className="size-8" />} heading="It's gone" {...envelope}>
        <p>It opened once, for you, and now it is ashes.</p>
      </Envelope>
    );
  }

  if (openLetter.data) {
    return (
      <BurningLetter onBurned={() => setBurnedHere(true)}>
        <Letter
          date={new Date(openLetter.data.createdAt)}
          title={openLetter.data.title}
          body={openLetter.data.description}
          footer={<LetterFooter {...envelope} />}
        />
      </BurningLetter>
    );
  }

  switch (letter.state) {
    case "open":
      return (
        <Letter
          date={new Date(letter.createdAt)}
          title={letter.title}
          body={letter.description}
          footer={<LetterFooter {...envelope} />}
        />
      );
    case "sealed":
      return (
        <Envelope
          icon={<LockIcon className="size-8" />}
          heading="This letter is sealed"
          {...envelope}
        >
          <p>
            It opens on{" "}
            <span className="font-mono text-sm text-primary">
              {formatMoment(new Date(letter.unsealAt))}
            </span>
            . Nobody can open it before then.
          </p>
        </Envelope>
      );
    case "ready-to-burn":
      return (
        <Envelope
          icon={<FlameIcon className="size-8" />}
          heading="This letter burns after reading"
          {...envelope}
        >
          <p>
            You can open it once. Pick a quiet moment: after you open it, the words are erased for
            everyone and can never be read again.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={openLetter.isPending}
            onClick={() => openLetter.mutate()}
          >
            {openLetter.isPending ? "Opening..." : "Open the letter"}
          </button>
        </Envelope>
      );
    case "burned":
      return (
        <Envelope
          icon={<FlameIcon className="size-8" />}
          heading="This letter has already burned"
          {...envelope}
        >
          <p>
            It was opened on{" "}
            <span className="font-mono text-sm text-primary">
              {formatPostmark(new Date(letter.burnedAt))}
            </span>{" "}
            and can only be opened once. If that wasn't you, let the person who wrote it know.
          </p>
        </Envelope>
      );
  }
};

const SharedLetterPage = () => {
  const { token = "" } = useParams();

  return (
    <div className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        <SharedLetter token={token} />

        <p className="mt-10 text-center text-sm text-base-content/50">
          Want to write one yourself?{" "}
          <Link to="/login" className="link link-hover text-primary">
            Start your desk
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SharedLetterPage;
