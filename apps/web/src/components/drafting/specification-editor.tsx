"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Button, Field, Input, Panel, PanelBody, PanelHeader, Textarea, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { DraftDetail } from "@/lib/types";

const ABSTRACT_WORD_LIMIT = 150;

// The sections a US specification is expected to contain, in filing order.
// Hints say what each is FOR, because a drafter writing the wrong thing into
// Background is a substantive problem, not a formatting one.
const SECTIONS = [
  {
    key: "technicalField",
    label: "Technical field",
    rows: 3,
    hint: "One or two sentences placing the invention in its art.",
  },
  {
    key: "background",
    label: "Background",
    rows: 8,
    hint: "The problem and what exists today. Be careful: anything you characterise as prior art here can be used against the application later.",
  },
  {
    key: "summary",
    label: "Summary",
    rows: 8,
    hint: "The invention stated broadly, usually mirroring the independent claims.",
  },
  {
    key: "briefDescriptionOfDrawings",
    label: "Brief description of drawings",
    rows: 4,
    hint: "One line per figure. Leave blank if there are no drawings.",
  },
  {
    key: "detailedDescription",
    label: "Detailed description",
    rows: 20,
    hint: "Enough detail that a skilled reader could build it, including alternatives. Enablement under §112(a) is decided on this section.",
  },
] as const;

export function SpecificationEditor({
  draft,
  disabled,
}: {
  draft: DraftDetail;
  disabled?: boolean;
}) {
  const [form, setForm] = React.useState({
    title: draft.title,
    abstract: draft.abstract,
    technicalField: draft.technicalField,
    background: draft.background,
    summary: draft.summary,
    briefDescriptionOfDrawings: draft.briefDescriptionOfDrawings,
    detailedDescription: draft.detailedDescription,
    changeNote: "",
  });
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<number | null>(null);

  const abstractWords = form.abstract.trim() ? form.abstract.trim().split(/\s+/).length : 0;
  const abstractOver = abstractWords > ABSTRACT_WORD_LIMIT;

  const dirty =
    form.title !== draft.title ||
    form.abstract !== draft.abstract ||
    form.technicalField !== draft.technicalField ||
    form.background !== draft.background ||
    form.summary !== draft.summary ||
    form.briefDescriptionOfDrawings !== draft.briefDescriptionOfDrawings ||
    form.detailedDescription !== draft.detailedDescription;

  function set(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      await api<DraftDetail>(`/drafts/${draft.id}`, {
        method: "PUT",
        // The revision this edit started from. A mismatch is a 409, never a
        // silent overwrite of someone else's work.
        json: { ...form, baseRevision: draft.revision },
      });
      setSaved(Date.now());
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError ? cause.body.message : "Could not save the specification.",
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Specification"
          caption={`Revision ${draft.revision}. Saving creates revision ${draft.revision + 1}.`}
        />
        <PanelBody className="space-y-5 px-6 py-6">
          <Field label="Title" htmlFor="spec-title" required>
            <Input
              id="spec-title"
              value={form.title}
              disabled={disabled}
              onChange={(event) => set("title", event.target.value)}
              className="font-serif text-[15px]"
            />
          </Field>

          <Field
            label="Abstract"
            htmlFor="spec-abstract"
            hint={
              <span className={cn(abstractOver && "text-critical")}>
                {abstractWords} / {ABSTRACT_WORD_LIMIT} words.{" "}
                {abstractOver
                  ? "37 CFR 1.72(b) caps the abstract at 150 words — this will be refused."
                  : "37 CFR 1.72(b) caps the abstract at 150 words."}
              </span>
            }
          >
            <Textarea
              id="spec-abstract"
              value={form.abstract}
              disabled={disabled}
              rows={4}
              onChange={(event) => set("abstract", event.target.value)}
              className={cn("font-serif text-[14px]", abstractOver && "border-critical")}
            />
          </Field>

          {SECTIONS.map((section) => (
            <Field
              key={section.key}
              label={section.label}
              htmlFor={`spec-${section.key}`}
              hint={section.hint}
            >
              <Textarea
                id={`spec-${section.key}`}
                value={form[section.key as keyof typeof form]}
                disabled={disabled}
                rows={section.rows}
                onChange={(event) => set(section.key, event.target.value)}
                className="font-serif text-[14px] leading-relaxed"
              />
            </Field>
          ))}

          <Field
            label="Change note"
            htmlFor="spec-note"
            hint="What changed in this revision. Shows in the history."
          >
            <Input
              id="spec-note"
              value={form.changeNote}
              disabled={disabled}
              placeholder="Expanded the detailed description with the thermal model"
              onChange={(event) => set("changeNote", event.target.value)}
            />
          </Field>

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

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={save}
          disabled={disabled || pending || !dirty || abstractOver}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Saving…" : `Save as revision ${draft.revision + 1}`}
        </Button>
        <p className="text-[11.5px] text-faint">
          {disabled
            ? "This specification is filed and cannot be edited."
            : dirty
              ? "Unsaved changes."
              : saved
                ? "Saved."
                : "No changes."}
        </p>
      </div>
    </div>
  );
}
