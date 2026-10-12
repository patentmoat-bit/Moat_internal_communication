"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@moat/ui";
import { FileDropzone } from "./file-dropzone";

const CATEGORIES = ["Supporting", "Disclosure", "Prior art", "Drawing", "Export"];

export function AddFiles({ inventionId }: { inventionId: string }) {
  const router = useRouter();
  const [files, setFiles] = React.useState<File[]>([]);
  const [category, setCategory] = React.useState("Supporting");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function upload() {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("category", category);
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`/api/inventions/${inventionId}/files`, { method: "POST", body: form }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    if (res?.ok) { setFiles([]); router.refresh(); }
    else setError(json?.error ?? "Upload failed.");
    setPending(false);
  }

  return (
    <div className="space-y-3">
      <FileDropzone files={files} onChange={setFiles} disabled={pending} />
      {files.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[12px] text-muted" htmlFor="file-cat">File type</label>
          <select id="file-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 text-[12.5px] text-ink">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button variant="primary" size="sm" onClick={upload} disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            Upload {files.length} file{files.length > 1 ? "s" : ""}
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-[12.5px] text-critical">{error}</p> : null}
    </div>
  );
}
