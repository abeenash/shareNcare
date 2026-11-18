import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { type Box, placeCard } from "../lib/place-card";
import { type TourTarget, tourSteps } from "../lib/tour-steps";
import Koinonia from "./Koinonia";

type WelcomeTourProps = {
  firstName: string;
  onClose: () => void;
};

type Found = {
  box: Box;
  hint?: string;
};

const PAD = 6;

function findTarget(targets: TourTarget[]): Found | null {
  for (const target of targets) {
    const element = document.querySelector(`[data-tour="${target.name}"]`);
    if (!element) continue;
    const { top, left, width, height } = element.getBoundingClientRect();
    if (width === 0 || left + width <= 0) continue;
    return { box: { top, left, width, height }, hint: target.hint };
  }
  return null;
}

const WelcomeTour = ({ firstName, onClose }: WelcomeTourProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const steps = useMemo(() => tourSteps(firstName), [firstName]);
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState<Found | null>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const step = steps[index] ?? steps[0];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  useLayoutEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useLayoutEffect(() => {
    const measure = () => setFound(findTarget(step?.targets ?? []));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    setPlace(
      placeCard(
        found?.box ?? null,
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [found]);

  const close = () => dialogRef.current?.close();
  const writeFirstLetter = () => {
    close();
    navigate("/create");
  };

  if (!step) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-transparent"
    >
      {found ? (
        <div
          data-testid="tour-spotlight"
          className="pointer-events-none fixed rounded-field shadow-[0_0_0_100vmax_rgb(0_0_0/0.65)] ring-2 ring-primary"
          style={{
            top: found.box.top - PAD,
            left: found.box.left - PAD,
            width: found.box.width + PAD * 2,
            height: found.box.height + PAD * 2,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65" />
      )}

      <div
        ref={cardRef}
        data-testid="tour-card"
        className="card fixed w-80 max-w-[calc(100vw-2rem)] border border-base-content/10 bg-base-200 shadow-xl"
        style={place ?? { top: 0, left: 0, visibility: "hidden" }}
      >
        <div className="card-body gap-3 p-5">
          {found ? (
            <div className="flex items-center gap-3">
              <Koinonia className="size-12 shrink-0" sparks={false} />
              <h2 id="tour-title" className="font-serif text-xl">
                {step.title}
              </h2>
            </div>
          ) : (
            <>
              <Koinonia className="mx-auto size-28" />
              <h2 id="tour-title" className="text-center font-serif text-2xl">
                {step.title}
              </h2>
            </>
          )}

          <p id="tour-body" aria-live="polite" className="text-base-content/80">
            {step.body} {found?.hint}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-xs text-base-content/50">
              {index + 1} / {steps.length}
            </span>
            <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={close}>
              {isLast ? "Later" : "Skip"}
            </button>
            {!isFirst && !isLast && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIndex(index - 1)}
              >
                Back
              </button>
            )}
            {/* showModal() focuses this button, so Enter moves on. It stays the same button
                on every step, so the focus stays with it. */}
            <button
              // biome-ignore lint/a11y/noAutofocus: a dialog should start on its main action
              autoFocus
              type="button"
              className="btn btn-primary btn-sm"
              onClick={isLast ? writeFirstLetter : () => setIndex(index + 1)}
            >
              {isFirst ? "Show me around" : isLast ? "Write my first letter" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

export default WelcomeTour;
