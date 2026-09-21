"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle } from "lucide-react";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Textarea,
} from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import { DrawingCard } from "./drawing-card";
import type { Drawing, DrawingsSummary } from "@/lib/types";

/** The drafter's view of the figures for one specification. */
export function DrawingsPanel({
  documentId,
  drawings,
  summary,
  canRequest,
  canReview,
}: {
  documentId: string;
  drawings: Drawing[];
  summary: DrawingsSummary | null;
  canRequest: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [requesting, setRequesting] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const nextFigure = drawings.length
    ? Math.max(...drawings.map((d) => d.figureNumber)) + 1
    : 1;

  async function request(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api(`/drafts/${documentId}/drawings`, {
        method: "POST",
        json: {
          figureNumber: Number(form.get("figureNumber")),
          caption: String(form.get("caption") ?? ""),
          brief: String(form.get("brief") ?? ""),
        },
      });
      setRequesting(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.body.message : "Could not request it.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Figures"
          caption={
            summary
              ? `${summary.approved} approved, ${summary.outstanding} outstanding`
              : undefined
          }
          actions={
            canRequest && !requesting ? (
              <Button size="sm" onClick={() => setRequesting(true)}>
                <ImagePlus />
                Request a figure
              </Button>
            ) : null
          }
        />

        {requesting ? (
          <PanelBody className="border-b border-line">
            <form onSubmit={request} className="space-y-3">
              <div className="flex gap-3">
                <Field label="Figure number" htmlFor="figureNumber" className="w-32">
                  <Input
                    id="figureNumber"
                    name="figureNumber"
                    type="number"
                    min={1}
                    defaultValue={nextFigure}
                    className="numeric"
                  />
                </Field>
                <Field label="Caption" htmlFor="caption" className="flex-1">
                  <Input
                    id="caption"
                    name="caption"
                    placeholder="is a schematic of the joint assembly."
                    className="font-serif text-[13px]"
                  />
                </Field>
              </div>
              <Field
                label="Brief"
                htmlFor="brief"
                required
                hint="What must the figure show? A vague brief is the main cause of rework."
              >
                <Textarea
                  id="brief"
                  name="brief"
                  rows={3}
                  required
                  minLength={5}
                  placeholder="Show the motor, winding, thermistor and controller, with the temperature signal path into the controller."
                />
              </Field>
              {error ? <p className="text-[12px] text-critical">{error}</p> : null}
              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary" size="sm" disabled={pending}>
                  {pending ? <LoaderCircle className="animate-spin" /> : null}
                  Send to design team
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRequesting(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </PanelBody>
        ) : null}

        {drawings.length === 0 ? (
          <EmptyState
            icon={<ImagePlus />}
            title="No figures yet"
            description="Request one and the design team picks it up. The specification's drawings section is composed from whatever exists here."
            className="py-8"
          />
        ) : summary ? (
          <PanelBody>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Brief description of the drawings
            </p>
            <pre className="font-document mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
              {summary.text}
            </pre>
            {summary.outstanding > 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-faint">
                Figures still to be approved are marked. This section is generated from the
                figures themselves, so it stays in step as they change.
              </p>
            ) : null}
          </PanelBody>
        ) : null}
      </Panel>

      {drawings.map((drawing) => (
        <DrawingCard
          key={drawing.id}
          drawing={drawing}
          canUpload={false}
          canReview={canReview}
        />
      ))}
    </div>
  );
}
