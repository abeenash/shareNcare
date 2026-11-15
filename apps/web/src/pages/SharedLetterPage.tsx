import { FlameIcon, KeyRoundIcon, LockIcon, MailQuestionIcon } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import BurningLetter from "../components/BurningLetter";
import Envelope from "../components/Envelope";
import Letter from "../components/Letter";
import Loader from "../components/Loader";
import Logo from "../components/Logo";
import { keyFromLink } from "../lib/key-from-link";
import { addressedTo, formatMoment, formatPostmark } from "../lib/utils";
import { useOpenLetter, useSharedLetter, useUnlockedWords } from "../note-queries";

const LetterFooter = ({ recipient, from }: { recipient: string | null; from: string }) => (
  <div className="flex flex-wrap justify-between gap-2 font-mono text-xs uppercase tracking-widest text-base-content/50">
    <span>{addressedTo(recipient)}</span>
    <span>From · {from}</span>
  </div>
);

type Addressed = { recipient: string | null; from: string };

type ReadableLetterProps = {
  letter: {
    title: string;
    description: string;
    createdAt: string;
    locked: boolean;
    photo?: string | null;
  };
  linkKey: string | null;
  envelope: Addressed;
};

// Shows a letter's words. Locked words are unlocked first, with the key that came
// in the link. The server only ever handed over the locked box.
const ReadableLetter = ({ letter, linkKey, envelope }: ReadableLetterProps) => {
  const unlocked = useUnlockedWords(letter.locked ? letter.description : undefined, linkKey);

  if (letter.locked && !linkKey) return <MissingKey {...envelope} />;
  if (letter.locked && unlocked.isError) {
    return (
      <Envelope
        icon={<KeyRoundIcon className="size-8" />}
        heading="This key doesn't fit"
        {...envelope}
      >
        <p>The key in this link doesn't open this letter. Ask {envelope.from} to send it again.</p>
      </Envelope>
    );
  }
  if (letter.locked && unlocked.data === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader />
      </div>
    );
  }

  return (
    <Letter
      date={new Date(letter.createdAt)}
      title={letter.title}
      body={unlocked.data ?? letter.description}
      photoUrl={letter.photo}
      footer={<LetterFooter {...envelope} />}
    />
  );
};

const MissingKey = (envelope: Addressed) => (
  <Envelope
    icon={<KeyRoundIcon className="size-8" />}
    heading="This letter is locked"
    {...envelope}
  >
    <p>
      Its key travels in the link, after the "#", and this link doesn't have one. Ask{" "}
      {envelope.from} to send you the whole link.
    </p>
  </Envelope>
);

const SharedLetter = ({ token }: { token: string }) => {
  // The key, if this letter is locked. It is read here, in the browser:
  // the part after "#" never travelled to the server.
  const linkKey = keyFromLink(useLocation().hash);
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
        <ReadableLetter letter={openLetter.data} linkKey={linkKey} envelope={envelope} />
      </BurningLetter>
    );
  }

  switch (letter.state) {
    case "open":
      return (
        <ReadableLetter
          letter={{ ...letter, photo: letter.photoUrl }}
          linkKey={linkKey}
          envelope={envelope}
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
      // Burning without the key would erase words nobody can ever read. Don't offer it.
      if (letter.locked && !linkKey) return <MissingKey {...envelope} />;
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
