import { type PointerEvent, type ReactNode, useEffect, useState } from "react";
import {
  firstParts,
  isHourOpen,
  isMinuteOpen,
  monthHasDay,
  openYears,
  type SealParts,
  settle,
  toDate,
} from "../lib/seal-time";

const CENTER = 140;
const RING = 112;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const STAGES = ["Day", "Month", "Year", "Hour", "Minute"] as const;
type Stage = (typeof STAGES)[number];

const pad = (n: number) => String(n).padStart(2, "0");
const to24Hour = (clockHour: number, isPm: boolean) => (clockHour % 12) + (isPm ? 12 : 0);

type DialProps = {
  label: Stage;
  options: number[];
  value: number;
  isOpen: (option: number) => boolean;
  text: (option: number) => string;
  labelEvery?: number;
  onChange: (option: number) => void;
  onDone: () => void;
  children: ReactNode;
};

const Dial = ({
  label,
  options,
  value,
  isOpen,
  text,
  labelEvery = 1,
  onChange,
  onDone,
  children,
}: DialProps) => {
  const target = (options.indexOf(value) / options.length) * 360;
  const [angle, setAngle] = useState(target);
  const [dragging, setDragging] = useState(false);

  // Turn the short way round, so going from 59 to 0 doesn't spin the hand backwards.
  const turn = ((((target - angle) % 360) + 540) % 360) - 180;
  if (Math.abs(turn) > 0.01) setAngle(angle + turn);

  const open = options.filter(isOpen);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    const degrees = (Math.atan2(x, -y) * 180) / Math.PI + 360;
    const option = options[Math.round((degrees / 360) * options.length) % options.length];
    if (option !== undefined && isOpen(option)) onChange(option);
  };

  return (
    <div className="animate-dial-in relative mx-auto aspect-square w-full max-w-72 motion-reduce:animate-none">
      <input
        type="range"
        aria-label={label}
        aria-valuetext={text(value)}
        min={0}
        max={open.length - 1}
        value={open.indexOf(value)}
        onChange={(e) => {
          const option = open[Number(e.target.value)];
          if (option !== undefined) onChange(option);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onDone();
          }
        }}
        className="peer sr-only"
      />
      <svg
        viewBox="0 0 280 280"
        aria-hidden="true"
        className="size-full cursor-pointer touch-none select-none rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          pick(e);
        }}
        onPointerMove={(e) => {
          if (dragging) pick(e);
        }}
        onPointerUp={() => {
          setDragging(false);
          onDone();
        }}
      >
        <circle cx={CENTER} cy={CENTER} r={136} className="fill-base-100 stroke-base-content/10" />

        <g
          className="motion-reduce:transition-none"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transition: dragging ? "none" : "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - RING}
            className="stroke-primary"
            strokeWidth={2}
          />
          <circle
            cx={CENTER}
            cy={CENTER - RING}
            r={15}
            className="fill-primary/25 stroke-primary"
          />
        </g>

        {options.map((option, index) => {
          const radians = (index / options.length) * 2 * Math.PI;
          const x = CENTER + RING * Math.sin(radians);
          const y = CENTER - RING * Math.cos(radians);
          const showsText = index % labelEvery === 0;
          const available = isOpen(option);

          return showsText ? (
            <text
              key={option}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono text-[11px] ${available ? "fill-base-content" : "fill-base-content/20"}`}
            >
              {text(option)}
            </text>
          ) : (
            <circle
              key={option}
              cx={x}
              cy={y}
              r={1.5}
              className={available ? "fill-base-content/50" : "fill-base-content/10"}
            />
          );
        })}

        <circle cx={CENTER} cy={CENTER} r={58} className="fill-base-200 stroke-base-content/10" />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
        {children}
      </div>
    </div>
  );
};

const CenterText = ({ value, caption }: { value: string; caption: string }) => (
  <>
    <span className="font-serif text-3xl leading-none text-primary">{value}</span>
    <span className="font-mono text-[10px] uppercase tracking-widest text-base-content/50">
      {caption}
    </span>
  </>
);

type SealClockProps = {
  onChange: (moment: Date) => void;
};

const SealClock = ({ onChange }: SealClockProps) => {
  const now = new Date();
  const [parts, setParts] = useState(() => firstParts(new Date()));
  const [stage, setStage] = useState<Stage>("Day");

  useEffect(() => {
    onChange(toDate(parts));
  }, [parts, onChange]);

  const change = (update: Partial<SealParts>) =>
    setParts(settle({ ...parts, ...update }, new Date()));

  const next = () => {
    const after = STAGES[STAGES.indexOf(stage) + 1];
    if (after) setStage(after);
  };

  const isPm = parts.hour >= 12;
  const clockHour = parts.hour % 12 || 12;

  const chips: [Stage, string][] = [
    ["Day", String(parts.day)],
    ["Month", MONTHS[parts.month] ?? ""],
    ["Year", String(parts.year)],
    ["Hour", `${clockHour} ${isPm ? "PM" : "AM"}`],
    ["Minute", pad(parts.minute)],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-1">
        {chips.map(([name, text]) => (
          <button
            key={name}
            type="button"
            aria-label={`Change ${name.toLowerCase()}`}
            onClick={() => setStage(name)}
            className={`btn btn-xs font-mono ${stage === name ? "btn-primary" : "btn-ghost"}`}
          >
            {text}
          </button>
        ))}
      </div>

      {stage === "Day" && (
        <Dial
          key="day"
          label="Day"
          options={DAYS}
          value={parts.day}
          isOpen={() => true}
          text={String}
          onChange={(day) => change({ day })}
          onDone={next}
        >
          <CenterText value={String(parts.day)} caption="Pick a day" />
        </Dial>
      )}

      {stage === "Month" && (
        <Dial
          key="month"
          label="Month"
          options={MONTHS.map((_, month) => month)}
          value={parts.month}
          isOpen={(month) => monthHasDay(parts.day, month)}
          text={(month) => MONTHS[month] ?? ""}
          onChange={(month) => change({ month })}
          onDone={next}
        >
          <CenterText value={MONTHS[parts.month] ?? ""} caption="Pick a month" />
        </Dial>
      )}

      {stage === "Year" && (
        <Dial
          key="year"
          label="Year"
          options={openYears(parts.day, parts.month, now)}
          value={parts.year}
          isOpen={() => true}
          text={(year) => `'${pad(year % 100)}`}
          labelEvery={2}
          onChange={(year) => change({ year })}
          onDone={next}
        >
          <CenterText value={String(parts.year)} caption="Pick a year" />
        </Dial>
      )}

      {stage === "Hour" && (
        <Dial
          key="hour"
          label="Hour"
          options={CLOCK_HOURS}
          value={clockHour}
          isOpen={(hour) => isHourOpen(parts, to24Hour(hour, isPm), now)}
          text={String}
          onChange={(hour) => change({ hour: to24Hour(hour, isPm) })}
          onDone={next}
        >
          <span className="font-serif text-3xl leading-none text-primary">{clockHour}</span>
          <div className="pointer-events-auto join">
            {[false, true].map((pm) => (
              <button
                key={String(pm)}
                type="button"
                aria-pressed={isPm === pm}
                disabled={!isHourOpen(parts, pm ? 23 : 11, now)}
                onClick={() => change({ hour: to24Hour(clockHour, pm) })}
                className={`btn btn-xs join-item ${isPm === pm ? "btn-primary" : "btn-ghost"}`}
              >
                {pm ? "PM" : "AM"}
              </button>
            ))}
          </div>
        </Dial>
      )}

      {stage === "Minute" && (
        <Dial
          key="minute"
          label="Minute"
          options={MINUTES}
          value={parts.minute}
          isOpen={(minute) => isMinuteOpen(parts, minute, now)}
          text={pad}
          labelEvery={5}
          onChange={(minute) => change({ minute })}
          onDone={next}
        >
          <CenterText value={`${clockHour}:${pad(parts.minute)}`} caption={isPm ? "PM" : "AM"} />
        </Dial>
      )}
    </div>
  );
};

export default SealClock;
