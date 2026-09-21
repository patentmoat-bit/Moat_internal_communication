export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      {/* The moat: an open ring, drawn as water around the keep. */}
      <path
        d="M12 2.5c5.25 0 9.5 4.25 9.5 9.5s-4.25 9.5-9.5 9.5S2.5 17.25 2.5 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* The keep: what the moat protects. */}
      <rect
        x="8"
        y="8"
        width="8"
        height="8"
        rx="1.6"
        fill="currentColor"
      />
    </svg>
  );
}
