import { FlameIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";

type BurningLetterProps = {
  children: ReactNode;
  onBurned: () => void;
};

const BURN_SECONDS = 2;

const EMBERS = Array.from({ length: 18 }, (_, id) => ({
  id,
  left: `${(id * 37) % 100}%`,
  delay: (id * 0.13) % (BURN_SECONDS - 1),
  drift: ((id * 53) % 60) - 30,
  size: 3 + (id % 3),
}));

const BurningLetter = ({ children, onBurned }: BurningLetterProps) => {
  const [burning, setBurning] = useState(false);
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <div className="relative">
        <motion.div
          initial={{ "--burn": "-20%", opacity: 1 }}
          animate={burning ? (reduceMotion ? { opacity: 0 } : { "--burn": "110%" }) : undefined}
          transition={reduceMotion ? { duration: 0.4 } : { duration: BURN_SECONDS, ease: "easeIn" }}
          onAnimationComplete={() => {
            if (burning) onBurned();
          }}
          style={{
            maskImage:
              "linear-gradient(to top, transparent var(--burn), black calc(var(--burn) + 20%))",
          }}
        >
          {children}
        </motion.div>

        {burning && !reduceMotion && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 h-24 bg-linear-to-t from-transparent via-primary/60 to-transparent"
              initial={{ bottom: "-10%" }}
              animate={{ bottom: "100%" }}
              transition={{ duration: BURN_SECONDS, ease: "easeIn" }}
            />
            {EMBERS.map((ember) => (
              <motion.span
                key={ember.id}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 rounded-full bg-primary"
                style={{ left: ember.left, width: ember.size, height: ember.size }}
                initial={{ y: 0, x: 0, opacity: 0 }}
                animate={{ y: -420, x: ember.drift, opacity: [0, 1, 0] }}
                transition={{ duration: 1, delay: ember.delay, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </div>

      {!burning && (
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <p className="max-w-md text-sm text-base-content/60">
            This is the only copy. It has already been erased from our servers, and it disappears
            when you leave this page.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setBurning(true)}>
            <FlameIcon className="size-4" />
            Let it burn
          </button>
        </div>
      )}
    </div>
  );
};

export default BurningLetter;
