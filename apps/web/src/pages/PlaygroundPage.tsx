import { useState } from "react";
import Koinonia from "../components/Koinonia";
import { placeCard } from "../lib/place-card";

// A TEMPORARY page for watching things get drawn while you type. Delete before committing.

const BIRD_PX = 512; // the bird is drawn 512 px wide on screen...
const UNITS = 128; // ...from a 128 x 128 viewBox, so 1 unit = 4 px
const lines = Array.from({ length: UNITS / 8 + 1 }, (_, i) => i * 8); // 0, 8, 16 ... 128

const SCREEN = { width: 600, height: 400 }; // a pretend screen for placeCard
const CARD = { width: 220, height: 130 };
const TARGET = { width: 60, height: 30 };

const PlaygroundPage = () => {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [targetLeft, setTargetLeft] = useState(270);
  const [targetTop, setTargetTop] = useState(40);
  const [hasTarget, setHasTarget] = useState(true);

  const target = hasTarget ? { left: targetLeft, top: targetTop, ...TARGET } : null;
  const card = placeCard(target, CARD, SCREEN);

  return (
    <div className="flex flex-wrap gap-12 p-8 font-mono text-sm">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg">Koinonia on its 128 × 128 grid</h2>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a temporary measuring tool */}
        <div
          className="relative bg-base-300"
          style={{ width: BIRD_PX, height: BIRD_PX }}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            setPoint({
              x: Math.round(((e.clientX - box.left) / box.width) * UNITS),
              y: Math.round(((e.clientY - box.top) / box.height) * UNITS),
            });
          }}
          onMouseLeave={() => setPoint(null)}
        >
          <Koinonia className="absolute inset-0 size-full" />
          <svg
            viewBox={`0 0 ${UNITS} ${UNITS}`}
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden="true"
          >
            {lines.map((at) => (
              <g
                key={at}
                stroke="white"
                strokeOpacity={at % 32 === 0 ? 0.35 : 0.1}
                strokeWidth="0.25"
              >
                <line x1={at} y1={0} x2={at} y2={UNITS} />
                <line x1={0} y1={at} x2={UNITS} y2={at} />
              </g>
            ))}
            {lines
              .filter((at) => at % 32 === 0)
              .map((at) => (
                <g key={`label-${at}`} fill="white" fillOpacity="0.6" fontSize="3">
                  <text x={at + 0.8} y={3.5}>
                    {at}
                  </text>
                  <text x={0.8} y={at + 3.5}>
                    {at}
                  </text>
                </g>
              ))}
          </svg>
        </div>
        <p>{point ? `Mouse at x ${point.x}, y ${point.y}` : "Move the mouse over the bird"}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">placeCard on a pretend 600 × 400 screen</h2>
        <div
          className="relative border border-base-content/30"
          style={{ width: SCREEN.width, height: SCREEN.height }}
        >
          {target && (
            <div
              className="absolute bg-primary/70"
              style={{
                left: target.left,
                top: target.top,
                width: target.width,
                height: target.height,
              }}
            />
          )}
          <div
            className="absolute border-2 border-info bg-info/20 p-2"
            style={{ left: card.left, top: card.top, width: CARD.width, height: CARD.height }}
          >
            card at left {Math.round(card.left)}, top {Math.round(card.top)}
          </div>
        </div>
        <label className="flex items-center gap-3">
          target left
          <input
            type="range"
            min={0}
            max={SCREEN.width - TARGET.width}
            value={targetLeft}
            onChange={(e) => setTargetLeft(Number(e.target.value))}
          />
          {targetLeft}
        </label>
        <label className="flex items-center gap-3">
          target top
          <input
            type="range"
            min={0}
            max={SCREEN.height - TARGET.height}
            value={targetTop}
            onChange={(e) => setTargetTop(Number(e.target.value))}
          />
          {targetTop}
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={hasTarget}
            onChange={(e) => setHasTarget(e.target.checked)}
          />
          highlight a target (off = card goes to the middle)
        </label>
      </section>
    </div>
  );
};

export default PlaygroundPage;
