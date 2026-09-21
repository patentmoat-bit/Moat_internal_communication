"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button, Field, Input, Panel, PanelBody, PanelHeader, Textarea } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { InventionDetail } from "@/lib/types";

export function InventionForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const created = await api<InventionDetail>("/inventions", {
        method: "POST",
        json: {
          title: String(form.get("title") ?? "").trim(),
          summary: String(form.get("summary") ?? "").trim(),
          problem: String(form.get("problem") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
          classifications: String(form.get("classifications") ?? "")
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean),
        },
      });
      router.push(`/inventions/${created.id}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError ? cause.body.message : "Could not save the disclosure.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <Panel>
        <PanelHeader
          title="Disclosure"
          caption="Written for a skilled engineer in the field, not for a lawyer. Detail is what makes it enforceable later."
        />
        <PanelBody className="space-y-5 px-6 py-6">
          <Field
            label="Title"
            htmlFor="title"
            required
            hint="One sentence naming the mechanism, not the product."
          >
            <Input
              id="title"
              name="title"
              required
              minLength={4}
              maxLength={500}
              autoFocus
              placeholder="Thermally-derated stiffness ceiling for collaborative arm joints"
            />
          </Field>

          <Field
            label="Summary"
            htmlFor="summary"
            hint="What it does and why it matters, in two or three sentences."
          >
            <Textarea id="summary" name="summary" rows={3} className="font-serif text-[14px]" />
          </Field>

          <Field
            label="Problem addressed"
            htmlFor="problem"
            hint="What goes wrong today, and what it costs."
          >
            <Textarea id="problem" name="problem" rows={4} className="font-serif text-[14px]" />
          </Field>

          <Field
            label="Technical description"
            htmlFor="description"
            hint="How it works, in enough detail that a skilled reader could build it. Enablement is a legal requirement, not a nicety."
          >
            <Textarea
              id="description"
              name="description"
              rows={10}
              className="font-serif text-[14px]"
            />
          </Field>

          <Field
            label="Classification codes"
            htmlFor="classifications"
            hint="Optional CPC codes, comma separated. Leave blank if unsure — counsel will assign them."
          >
            <Input
              id="classifications"
              name="classifications"
              placeholder="B25J 9/16, G05B 13/04"
              className="font-mono text-[12.5px]"
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

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Saving…" : "Create disclosure"}
        </Button>
        <Button variant="ghost" size="lg" asChild>
          <Link href="/inventions">Cancel</Link>
        </Button>
        <p className="ml-auto text-[11.5px] text-faint">Saved as a draft. Nobody is notified yet.</p>
      </div>
    </form>
  );
}
