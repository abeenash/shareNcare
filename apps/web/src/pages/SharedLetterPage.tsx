import { MailQuestionIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import Letter from "../components/Letter";
import Loader from "../components/Loader";
import Logo from "../components/Logo";
import { addressedTo } from "../lib/utils";
import { useSharedLetter } from "../note-queries";

const SharedLetterPage = () => {
  const { token = "" } = useParams();
  const { data: letter, isPending, error } = useSharedLetter(token);

  return (
    <div className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        {isPending && (
          <div className="flex justify-center py-10">
            <Loader />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <MailQuestionIcon className="size-10 text-primary" />
            <h1 className="font-serif text-3xl">This letter isn't here</h1>
            <p className="max-w-sm text-base-content/60">
              The link may be mistyped, or the person who wrote it stopped sharing it.
            </p>
          </div>
        )}

        {letter && (
          <Letter
            date={new Date(letter.createdAt)}
            title={letter.title}
            body={letter.description}
            footer={
              <div className="flex flex-wrap justify-between gap-2 font-mono text-xs uppercase tracking-widest text-base-content/50">
                <span>{addressedTo(letter.recipient)}</span>
                <span>From · {letter.from}</span>
              </div>
            }
          />
        )}

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
