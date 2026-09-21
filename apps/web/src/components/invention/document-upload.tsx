"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, LoaderCircle, ScanLine, Upload, X } from "lucide-react";
import { Badge, Button, EmptyState, Panel, PanelBody, PanelHeader, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import { useJob } from "@/components/events/event-stream";
import { formatDate } from "@/lib/display";
import type { JobAccepted, SourceDocument, UploadReserved } from "@/lib/types";

const STATE_LABEL: Record<SourceDocument["state"], { label: string; tone: Parameters<typeof Badge>[0]["tone"] }> = {
  quarantined: { label: "Quarantined", tone: "neutral" },
  scanning: { label: "Scanning", tone: "accent" },
  extracting: { label: "Extracting", tone: "accent" },
  ready: { label: "Ready", tone: "positive" },
  rejected: { label: "Rejected", tone: "critical" },
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload({
  inventionId,
  documents,
  canUpload,
}: {
  inventionId: string;
  documents: SourceDocument[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const job = useJob(jobId);

  async function upload(file: File) {
    setPending(file.name);
    setError(null);
    setJobId(null);
    try {
      // Reserve first. The server validates the declaration and allocates the
      // key; the client never picks where bytes land.
      const reserved = await api<UploadReserved>("/uploads", {
        method: "POST",
        json: {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          inventionId,
        },
      });

      if (reserved.method === "PUT") {
        // Direct to object storage: the bytes never touch the API.
        const response = await fetch(reserved.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "content-type": file.type },
        });
        if (!response.ok) throw new Error("The storage service rejected the upload.");
      } else {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(reserved.uploadUrl, { method: "POST", body: form });
        if (!response.ok) throw new Error("The upload was not accepted.");
      }

      const accepted = await api<JobAccepted>(`/uploads/${reserved.uploadId}/complete`, {
        method: "POST",
        json: {},
      });
      setJobId(accepted.job.id);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.body.message
          : cause instanceof Error
            ? cause.message
            : "The upload failed.",
      );
    } finally {
      setPending(null);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  const busy = pending !== null || (job !== null && job.status !== "succeeded" && job.status !== "failed");

  return (
    <Panel>
      <PanelHeader
        title="Documents"
        caption="Specs, drawings and notes attached to this disclosure. Text is extracted so it can be searched."
        actions={
          canUpload ? (
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
              Add file
            </Button>
          ) : null
        }
      />

      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />

      {documents.length === 0 && !busy ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "m-3 rounded-[var(--radius-md)] border border-dashed transition-colors",
            dragging ? "border-accent bg-accent-soft" : "border-line",
          )}
        >
          <EmptyState
            icon={<FileText />}
            title={canUpload ? "Drop a file here" : "No documents yet"}
            description={
              canUpload
                ? "PDF, DOCX or plain text, up to 100 MB. Scanned pages are flagged — they need OCR to be searchable."
                : undefined
            }
          />
        </div>
      ) : (
        <ul>
          {documents.map((document, index) => {
            const state = STATE_LABEL[document.state];
            const needsOcr = (document.pagesNeedingOcr ?? 0) > 0;
            return (
              <li key={document.id} className={index > 0 ? "border-t border-line" : undefined}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">
                        {document.filename}
                      </span>
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {needsOcr ? (
                        <Badge tone="caution" title="These pages have no text layer">
                          <ScanLine className="size-3" />
                          {document.pagesNeedingOcr} page(s) need OCR
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-faint">
                      {humanSize(document.sizeBytes)}
                      {document.pageCount ? ` · ${document.pageCount} pages` : ""} ·{" "}
                      {formatDate(document.createdAt)}
                    </p>
                    {document.rejectionReason ? (
                      <p className="mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug text-critical">
                        <AlertTriangle className="mt-px size-3 shrink-0" />
                        {document.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {busy || error ? (
        <PanelBody className="border-t border-line py-2.5">
          {pending ? (
            <p className="flex items-center gap-2 text-[12px] text-muted">
              <LoaderCircle className="size-3.5 animate-spin" />
              Uploading {pending}…
            </p>
          ) : null}
          {job && job.status !== "succeeded" && job.status !== "failed" ? (
            <p className="flex items-center gap-2 text-[12px] text-muted">
              <LoaderCircle className="size-3.5 animate-spin" />
              {job.status === "queued" ? "Queued for extraction…" : job.detail || "Extracting…"}
            </p>
          ) : null}
          {error ? (
            <p className="flex items-start gap-1.5 text-[12px] leading-snug text-critical">
              <X className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </PanelBody>
      ) : null}
    </Panel>
  );
}
