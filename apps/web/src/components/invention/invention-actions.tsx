"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, PencilLine, RotateCw, Send } from "lucide-react";
import { Button } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import { usePermission } from "@/components/auth/session-context";
import { useJob } from "@/components/events/event-stream";
import { PERMISSIONS, type InventionDetail, type JobAccepted } from "@/lib/types";

export function InventionActions({ invention }: { invention: InventionDetail }) {
  const router = useRouter();
  const canRun = usePermission(PERMISSIONS.analysisRun);
  const canSubmit = usePermission(PERMISSIONS.inventionSubmit);
  const canEdit = usePermission(PERMISSIONS.inventionUpdate);

  const [jobId, setJobId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"analysis" | "submit" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  const job = useJob(jobId);
  const analysisRunning = job !== null && (job.status === "queued" || job.status === "running");
  const submittable = invention.status === "draft" || invention.status === "returned";
  const editable = invention.status !== "filed";

  async function runAnalysis() {
    setBusy("analysis");
    setError(null);
    setNote(null);
    try {
      // 202: the work is durable from here, and its progress arrives over the
      // event stream. Closing the tab does not cancel it.
      const accepted = await api<JobAccepted>(`/inventions/${invention.id}/analyses`, {
        method: "POST",
      });
      setJobId(accepted.job.id);
      if (!accepted.created) {
        setNote("A search for this revision was already running — showing that one.");
      }
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 429) {
        setError(cause.body.message);
      } else {
        setError(cause instanceof ApiRequestError ? cause.body.message : "That did not work.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("submit");
    setError(null);
    try {
      await api(`/inventions/${invention.id}/submit`, { method: "POST", json: { note: "" } });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.body.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {canEdit && editable ? (
          <Button size="lg" variant="ghost" asChild>
            <Link href={`/inventions/${invention.id}/edit`}>
              <PencilLine />
              Edit
            </Link>
          </Button>
        ) : null}

        {canRun ? (
          <Button
            size="lg"
            variant="secondary"
            onClick={runAnalysis}
            disabled={busy !== null || analysisRunning}
          >
            {busy === "analysis" || analysisRunning ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <RotateCw />
            )}
            {analysisRunning
              ? job?.status === "queued"
                ? "Queued…"
                : "Searching…"
              : invention.latestAnalysis
                ? "Re-run search"
                : "Search prior art"}
          </Button>
        ) : null}

        {canSubmit ? (
          <Button
            size="lg"
            variant="primary"
            onClick={submit}
            disabled={busy !== null || !submittable}
            title={
              submittable
                ? undefined
                : `A disclosure in state "${invention.status}" cannot be submitted.`
            }
          >
            {busy === "submit" ? <LoaderCircle className="animate-spin" /> : <Send />}
            Submit for review
          </Button>
        ) : null}
      </div>

      {job?.status === "failed" ? (
        <p className="max-w-sm text-right text-[11.5px] leading-snug text-critical">
          Search failed ({job.failureCategory}). No conclusion should be drawn from this — it means
          the search did not run, not that nothing was found.
        </p>
      ) : null}

      {note ? (
        <p className="max-w-sm text-right text-[11.5px] leading-snug text-faint">{note}</p>
      ) : null}

      {error ? (
        <p role="alert" className="max-w-sm text-right text-[11.5px] leading-snug text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
