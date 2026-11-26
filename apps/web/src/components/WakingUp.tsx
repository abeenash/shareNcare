import { useEffect, useState } from "react";

//Render sleeps when nobody is around, and the 1st visit wakes it up to ~30s
const SLOW_AFTER_MS = 4000;

const WakingUp = () => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p aria-live="polite" className="max-w-xs text-center text-sm text-base-content/60">
      {slow &&
        "Koinonia is waking the server up. After a quiet while, this can take up to 30 seconds."}
    </p>
  );
};

export default WakingUp;
