const LiveBadge = ({ live }: { live: boolean }) => (
  <span
    role="status"
    className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-base-content/60"
  >
    <span className={`size-2 rounded-full ${live ? "bg-success" : "bg-base-content/30"}`} />
    {live ? "Live" : "Connecting"}
  </span>
);

export default LiveBadge;
