"use client";

import * as React from "react";
import { Download, FileCode2, FileText, LoaderCircle } from "lucide-react";
import { Button, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { ExportFormat, Job, JobAccepted } from "@/lib/types";

const FORMATS: { value: ExportFormat; label: string; note: string; icon: typeof FileText }[] = [
  { value: "docx", label: "Word (.docx)", note: "Editable, filing layout", icon: FileText },
  { value: "pdf", label: "PDF", note: "For circulation", icon: FileText },
  {
    value: "xml",
    label: "XML (ST.36)",
    note: "Structured, not a filing package",
    icon: FileCode2,
  },
];

export function ExportMenu({ documentId }: { documentId: string }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<ExportFormat | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function run(format: ExportFormat) {
    setBusy(format);
    setError(null);
    setOpen(false);
    try {
      // The export is a job: PDF conversion runs an office suite in a separate
      // service, so it is queued rather than held open on this request.
      const accepted = await api<JobAccepted>(`/drafts/${documentId}/exports`, {
        method: "POST",
        json: { format },
      });

      // Bounded by attempt count rather than wall clock: no clock reads, and
      // the ceiling is explicit rather than implied by a duration.
      const POLL_MS = 700;
      const MAX_ATTEMPTS = 170; // ~2 minutes
      let job: Job = accepted.job;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (job.status === "succeeded" || job.status === "failed") break;
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        job = await api<Job>(`/jobs/${job.id}`);
      }

      if (job.status !== "succeeded") {
        setError(
          job.failureCategory === "conversion_unavailable"
            ? "The conversion service is unavailable, so no PDF was produced. Try DOCX."
            : `Export ${job.status}. ${job.detail}`,
        );
        return;
      }

      // A real anchor click rather than a navigation: the response carries
      // Content-Disposition: attachment, so the browser saves it and the page
      // stays where it is. The session cookie goes with the request, and
      // nothing large is held in memory.
      const link = document.createElement("a");
      link.href = `/api/v1/drafts/${documentId}/exports/${job.id}/download`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.body.message : "The export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button onClick={() => setOpen((value) => !value)} disabled={busy !== null}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Download />}
        {busy ? `Rendering ${busy.toUpperCase()}…` : "Export"}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 w-[260px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-raised p-1 shadow-[var(--shadow-lg)]">
          {FORMATS.map(({ value, label, note, icon: Icon }) => (
            <button
              key={value}
              onClick={() => run(value)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors hover:bg-hover",
              )}
            >
              <Icon className="mt-0.5 size-[15px] shrink-0 text-faint" />
              <span className="min-w-0">
                <span className="block text-[13px] text-ink">{label}</span>
                <span className="block text-[11px] leading-snug text-faint">{note}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="absolute right-0 top-full z-30 mt-1 w-[280px] rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-2.5 py-2 text-[11.5px] leading-snug text-critical"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
