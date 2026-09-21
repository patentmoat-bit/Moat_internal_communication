"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, History, ImageIcon, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { Avatar, Badge, Button, Panel, PanelBody, PanelHeader, Textarea, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import { drawingStatusMeta, formatDate } from "@/lib/display";
import type { Drawing } from "@/lib/types";

export function DrawingCard({
  drawing,
  canUpload,
  canReview,
  showDocument = false,
}: {
  drawing: Drawing;
  canUpload: boolean;
  canReview: boolean;
  showDocument?: boolean;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewing, setReviewing] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [showHistory, setShowHistory] = React.useState(false);

  const status = drawingStatusMeta[drawing.status];
  const latestReview = drawing.reviews[0];
  // A rework note is the whole reason the figure came back, so it leads.
  const openRework = drawing.status === "rework" ? latestReview : null;

  async function act(label: string, run: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await run();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.body.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    await act("upload", async () => {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(
        `/api/v1/drawings/${drawing.id}/versions?notes=${encodeURIComponent(notes)}`,
        { method: "POST", body: form },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiRequestError(response.status, body?.error ?? {
          code: "upload_failed",
          message: "The upload was refused.",
          requestId: "",
        });
      }
      setNotes("");
    });
  }

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <span className="numeric">FIG. {drawing.figureNumber}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
            {showDocument ? (
              <span className="numeric text-[11px] font-normal text-faint">
                {drawing.documentRef}
              </span>
            ) : null}
          </span>
        }
        caption={drawing.caption || undefined}
        actions={
          drawing.assignedTo ? (
            <span className="flex items-center gap-1.5">
              <Avatar name={drawing.assignedTo.name} size={20} />
              <span className="text-[11.5px] text-muted">{drawing.assignedTo.name}</span>
            </span>
          ) : (
            <span className="text-[11.5px] text-faint">unassigned</span>
          )
        }
      />

      <PanelBody className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Brief</p>
          <p className="font-document mt-0.5 text-[13px] leading-relaxed text-ink">
            {drawing.brief}
          </p>
        </div>

        {openRework ? (
          <div className="rounded-[var(--radius-sm)] border border-caution/25 bg-caution-soft px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-caution">
              Sent back by {openRework.reviewer.name}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-caution">
              {openRework.notes || "No notes given."}
            </p>
          </div>
        ) : null}

        {drawing.currentVersion > 0 ? (
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-line bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/v1/drawings/${drawing.id}/versions/${drawing.currentVersion}/file`}
              alt={`Figure ${drawing.figureNumber}, version ${drawing.currentVersion}`}
              className="max-h-72 w-full bg-white object-contain"
            />
            <p className="flex items-center justify-between border-t border-line px-2.5 py-1.5 text-[11px] text-faint">
              <span className="numeric">version {drawing.currentVersion}</span>
              {drawing.versions.length > 1 ? (
                <button
                  onClick={() => setShowHistory((value) => !value)}
                  className="flex items-center gap-1 hover:text-muted"
                >
                  <History className="size-3" />
                  {drawing.versions.length} versions
                </button>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-line px-3 py-6 text-[12px] text-faint">
            <ImageIcon className="size-4" />
            Nothing uploaded yet.
          </div>
        )}

        {showHistory ? (
          <ul className="space-y-1 text-[11.5px]">
            {drawing.versions.map((version) => {
              const review = drawing.reviews.find((r) => r.version === version.version);
              return (
                <li key={version.id} className="flex items-center gap-2 text-faint">
                  <span className="numeric">v{version.version}</span>
                  <span>{version.uploadedBy?.name ?? "unknown"}</span>
                  <span>{formatDate(version.createdAt)}</span>
                  {review ? (
                    <span
                      className={cn(
                        review.outcome === "approved" ? "text-positive" : "text-caution",
                      )}
                    >
                      {review.outcome}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" className="text-[12px] leading-snug text-critical">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {canUpload && drawing.status !== "approved" ? (
            <>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept="image/png,image/jpeg,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.target.value = "";
                }}
              />
              {!drawing.assignedTo ? (
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    act("assign", () =>
                      api(`/drawings/${drawing.id}/assign`, { method: "POST", json: {} }),
                    )
                  }
                >
                  {busy === "assign" ? <LoaderCircle className="animate-spin" /> : null}
                  Take this figure
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="primary"
                disabled={busy !== null}
                onClick={() => inputRef.current?.click()}
              >
                {busy === "upload" ? <LoaderCircle className="animate-spin" /> : <Upload />}
                Upload{drawing.currentVersion > 0 ? " new version" : ""}
              </Button>
            </>
          ) : null}

          {canReview && drawing.status === "submitted" ? (
            reviewing ? null : (
              <Button size="sm" variant="primary" onClick={() => setReviewing(true)}>
                Review version {drawing.currentVersion}
              </Button>
            )
          ) : null}
        </div>

        {canUpload && drawing.status !== "approved" ? (
          <Textarea
            value={notes}
            rows={2}
            placeholder="Notes for this version (optional)"
            onChange={(event) => setNotes(event.target.value)}
            className="text-[12.5px]"
          />
        ) : null}

        {reviewing ? (
          <form
            className="space-y-2 rounded-[var(--radius-sm)] border border-line bg-sunken p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const outcome = String(form.get("outcome"));
              void act("review", () =>
                api(`/drawings/${drawing.id}/reviews`, {
                  method: "POST",
                  json: {
                    outcome,
                    notes: String(form.get("notes") ?? ""),
                    // The version on screen. A newer upload must not inherit
                    // this verdict.
                    version: drawing.currentVersion,
                  },
                }),
              ).then(() => setReviewing(false));
            }}
          >
            <Textarea
              name="notes"
              rows={3}
              placeholder="What needs changing? Specific notes save a round trip."
              className="text-[12.5px]"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" name="outcome" value="approved" variant="primary" size="sm">
                <CheckCircle2 />
                Approve
              </Button>
              <Button type="submit" name="outcome" value="rework" size="sm">
                <RotateCcw />
                Send back
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setReviewing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
