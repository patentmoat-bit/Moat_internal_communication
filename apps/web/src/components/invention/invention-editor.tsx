"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Button, Field, Input, Panel, PanelBody, PanelHeader, Textarea } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { InventionDetail } from "@/lib/types";

export function InventionEditor({ invention }: { invention: InventionDetail }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState<number | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setConflict(null);
    try {
      await api<InventionDetail>(`/inventions/${invention.id}`, {
        method: "PUT",
        json: {
          title: String(form.get("title") ?? "").trim(),
          summary: String(form.get("summary") ?? "").trim(),
          problem: String(form.get("problem") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
          classifications: String(form.get("classifications") ?? "")
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean),
          // The revision this edit started from. If someone else saved in the
          // meantime the API refuses rather than discarding their work.
          baseRevision: invention.revision,
        },
      });
      router.push(`/inventions/${invention.id}`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.body.code === "revision_conflict") {
        setConflict(Number(cause.body.current_revision ?? 0));
      } else {
        setError(
          cause instanceof ApiRequestError ? cause.body.message : "Could not save the disclosure.",
        );
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <Panel>
        <PanelHeader
          title={invention.ref}
          caption={`Editing revision ${invention.revision}. Saving creates revision ${invention.revision + 1}.`}
        />
        <PanelBody className="space-y-5 px-6 py-6">
          <Field label="Title" htmlFor="title" required>
            <Input
              id="title"
              name="title"
              required
              minLength={4}
              maxLength={500}
              defaultValue={invention.title}
            />
          </Field>

          <Field label="Summary" htmlFor="summary">
            <Textarea
              id="summary"
              name="summary"
              rows={3}
              defaultValue={invention.summary}
              className="font-serif text-[14px]"
            />
          </Field>

          <Field label="Problem addressed" htmlFor="problem">
            <Textarea
              id="problem"
              name="problem"
              rows={5}
              defaultValue={invention.problem}
              className="font-serif text-[14px]"
            />
          </Field>

          <Field
            label="Technical description"
            htmlFor="description"
            hint="Enough detail that a skilled reader could build it. Enablement is a legal requirement."
          >
            <Textarea
              id="description"
              name="description"
              rows={14}
              defaultValue={invention.description}
              className="font-serif text-[14px]"
            />
          </Field>

          <Field label="Classification codes" htmlFor="classifications">
            <Input
              id="classifications"
              name="classifications"
              defaultValue={invention.classifications.join(", ")}
              className="font-mono text-[12.5px]"
            />
          </Field>

          {conflict !== null ? (
            <div className="flex gap-2.5 rounded-[var(--radius-sm)] border border-caution/25 bg-caution-soft px-3 py-2.5">
              <AlertTriangle className="mt-px size-[15px] shrink-0 text-caution" />
              <div className="text-[12px] leading-relaxed text-caution">
                <p className="font-medium">Someone else saved while you were editing.</p>
                <p className="mt-1">
                  The disclosure is now at revision {conflict}. Your text has not been discarded —
                  copy anything you need, then reload to edit the current revision.
                </p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    router.refresh();
                    setConflict(null);
                  }}
                >
                  Reload current revision
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-3 py-2 text-[12.5px] leading-relaxed text-critical"
            >
              {error}
            </p>
          ) : null}
        </PanelBody>
      </Panel>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Saving…" : `Save as revision ${invention.revision + 1}`}
        </Button>
        <Button variant="ghost" size="lg" asChild>
          <Link href={`/inventions/${invention.id}`}>Cancel</Link>
        </Button>
        {invention.decision && !invention.decision.superseded ? (
          <p className="ml-auto max-w-sm text-right text-[11.5px] leading-snug text-caution">
            This disclosure has an active decision from {invention.decision.reviewer.name}. Saving
            will stop it applying to the new text.
          </p>
        ) : null}
      </div>
    </form>
  );
}
