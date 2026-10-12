"use client";

import * as React from "react";
import { FileUp, X } from "lucide-react";

const ACCEPT = ".pdf,.doc,.docx,.txt,.md,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.svg,.webp,.zip";
const MAX_MB = 25;

const size = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Drag-and-drop or browse. The parent owns the file list. */
export function FileDropzone({ files, onChange, disabled }: { files: File[]; onChange: (f: File[]) => void; disabled?: boolean }) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    onChange(next);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Add files"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) add(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed px-4 py-6 text-center transition-colors ${
          over ? "border-accent bg-accent-soft" : "border-line-strong bg-sunken hover:bg-hover"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <FileUp className="size-5 text-accent-text" />
        <p className="text-[13px] font-medium text-ink">Drop files here or click to browse</p>
        <p className="text-[11.5px] text-faint">PDF, Word, text, spreadsheets, images, ZIP · up to {MAX_MB} MB each</p>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>

      {files.length > 0 ? (
        <ul className="mt-3 divide-y divide-line rounded-[var(--radius-sm)] border border-line">
          {files.map((f) => (
            <li key={f.name + f.size} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
              <span className="min-w-0 truncate text-ink">{f.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-faint">
                {size(f.size)}
                <button type="button" aria-label={`Remove ${f.name}`} disabled={disabled} onClick={() => onChange(files.filter((x) => x !== f))} className="rounded p-0.5 hover:bg-hover hover:text-ink">
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
