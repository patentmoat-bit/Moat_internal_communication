"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";
import { Button, Field, Input } from "@moat/ui";
import { FileDropzone } from "./file-dropzone";

const areaClass =
  "w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:outline-none";

export function DisclosureForm() {
  const router = useRouter();
  const [files, setFiles] = React.useState<File[]>([]);
  const [inventors, setInventors] = React.useState([{ name: "", email: "" }]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("inventors", JSON.stringify(inventors));
    files.forEach((f) => form.append("files", f));
    try {
      const res = await fetch("/api/inventions", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not save the disclosure.");
      router.replace(`/inventions/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the server.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6 px-6 py-5">
      <Field label="Title" htmlFor="title" required>
        <Input id="title" name="title" required minLength={3} maxLength={200} placeholder="e.g. Machine-learning thermostat routing" disabled={pending} />
      </Field>

      <Field label="Summary" htmlFor="summary" required>
        <textarea id="summary" name="summary" required minLength={10} maxLength={4000} rows={4} className={areaClass} placeholder="What is the invention, in a few sentences?" disabled={pending} />
      </Field>

      <Field label="Technical field" htmlFor="field">
        <Input id="field" name="field" maxLength={200} placeholder="e.g. Smart-building energy management" disabled={pending} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Problem it solves" htmlFor="problem">
          <textarea id="problem" name="problem" maxLength={4000} rows={4} className={areaClass} disabled={pending} />
        </Field>
        <Field label="How it solves it" htmlFor="solution">
          <textarea id="solution" name="solution" maxLength={4000} rows={4} className={areaClass} disabled={pending} />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[12.5px] font-medium text-ink">Inventors</legend>
        {inventors.map((inv, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`Inventor ${i + 1} name`} placeholder="Name" value={inv.name} disabled={pending}
              onChange={(e) => setInventors(inventors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input aria-label={`Inventor ${i + 1} email`} type="email" placeholder="Email (optional)" value={inv.email} disabled={pending}
              onChange={(e) => setInventors(inventors.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
            {inventors.length > 1 ? (
              <button type="button" aria-label="Remove inventor" className="rounded px-2 text-faint hover:bg-hover hover:text-ink" onClick={() => setInventors(inventors.filter((_, j) => j !== i))}>
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => setInventors([...inventors, { name: "", email: "" }])} disabled={pending}>
          <Plus /> Add inventor
        </Button>
      </fieldset>

      <div>
        <p className="mb-1 text-[12.5px] font-medium text-ink">Your files</p>
        <FileDropzone files={files} onChange={setFiles} disabled={pending} />
      </div>

      {error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-3 py-2 text-[12.5px] text-critical">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/inventions")} disabled={pending}>Cancel</Button>
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Saving…" : "Submit disclosure"}
        </Button>
      </div>
    </form>
  );
}
