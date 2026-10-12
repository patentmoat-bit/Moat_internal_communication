/** The one way in. A plain link: sign-in is a full-page redirect to Microsoft, not a form. */
export function MicrosoftButton({ label = "Sign in with Microsoft", className = "" }: { label?: string; className?: string }) {
  return (
    <a
      href="/api/auth/microsoft/login"
      className={`inline-flex items-center justify-center gap-3 rounded-[var(--radius-md)] border border-line-strong bg-surface px-5 py-3 text-[14px] font-semibold text-ink shadow-[var(--shadow-sm)] transition-colors hover:bg-hover focus-visible:outline-none ${className}`}
    >
      <svg viewBox="0 0 21 21" className="size-[18px]" aria-hidden>
        <path fill="#f25022" d="M1 1h9v9H1z" />
        <path fill="#7fba00" d="M11 1h9v9h-9z" />
        <path fill="#00a4ef" d="M1 11h9v9H1z" />
        <path fill="#ffb900" d="M11 11h9v9h-9z" />
      </svg>
      {label}
    </a>
  );
}
