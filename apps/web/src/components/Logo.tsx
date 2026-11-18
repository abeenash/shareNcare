import { Link } from "react-router";
import Koinonia from "./Koinonia";

type LogoProps = {
  compact?: boolean;
};

const Logo = ({ compact = false }: LogoProps) => (
  <Link to="/" className="flex items-center gap-2 font-serif italic text-2xl tracking-tight">
    <Koinonia className="size-8 shrink-8" sparks={false} />
    <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
      ShareN<span className="text-primary">Care</span>
    </span>
  </Link>
);

export default Logo;
