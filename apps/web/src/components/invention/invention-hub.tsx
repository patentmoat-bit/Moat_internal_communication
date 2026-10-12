import Link from "next/link";
import { Download, Eye, FileText, FileSearch, PenTool, Package, Paperclip } from "lucide-react";
import { Badge, EmptyState, Panel, PanelBody, PanelHeader } from "@moat/ui";
import { PageHeader } from "@/components/shell/page-header";
import { AddFiles } from "./add-files";
import { DeleteButton } from "./delete-button";
import { formatDate } from "@/lib/display";
import type { getHub, FileCategory } from "@/lib/inventionStore";

type Hub = NonNullable<ReturnType<typeof getHub>>;

const ICON: Record<FileCategory, React.ReactNode> = {
  Disclosure: <FileText className="size-4" />,
  "Prior art": <FileSearch className="size-4" />,
  Drawing: <PenTool className="size-4" />,
  Export: <Package className="size-4" />,
  Supporting: <Paperclip className="size-4" />,
};
const ORDER: FileCategory[] = ["Disclosure", "Prior art", "Drawing", "Export", "Supporting"];

/** Everything about one invention in one place: the disclosure, its status, and every file. */
export function InventionHub({ hub, canUpload, canDelete, inWorkflow }: { hub: Hub; canUpload: boolean; canDelete: boolean; inWorkflow: boolean }) {
  const { invention: inv, row, files, claimStatus, assignment } = hub;
  const groups = ORDER.map((c) => ({ category: c, items: files.filter((f) => f.category === c) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Inventions", href: "/inventions" }, { label: row.id }]}
        title={row.title}
        meta={
          <>
            <Badge tone="neutral">{row.status.replace(/_/g, " ").toLowerCase()}</Badge>
            <span className="text-[12px] text-faint">{files.length} file{files.length === 1 ? "" : "s"}</span>
            <span className="text-[12px] text-faint">updated {formatDate(row.updatedAt)}</span>
          </>
        }
      />

      <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="All files" />
            <PanelBody>
              {groups.length === 0 ? (
                <EmptyState icon={<FileText />} title="No files yet" description="Add your documents on the right. Everything attached to this invention appears here." />
              ) : (
                <div className="space-y-5">
                  {groups.map((g) => (
                    <section key={g.category}>
                      <h3 className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                        {ICON[g.category]} {g.category} <span className="numeric">({g.items.length})</span>
                      </h3>
                      <ul className="divide-y divide-line rounded-[var(--radius-sm)] border border-line">
                        {g.items.map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-ink">{f.name}</p>
                              <p className="text-[11.5px] text-faint">
                                {[f.size, f.uploadedBy, f.uploadedAt ? formatDate(f.uploadedAt) : ""].filter((x) => x && x !== "—").join(" · ")}
                              </p>
                              {f.note ? <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted">{f.note}</p> : null}
                            </div>
                            <span className="flex shrink-0 items-center gap-1">
                            {f.downloadable ? (
                              <>
                                {f.previewable ? (
                                  <a href={`/api/inventions/${row.id}/files/${f.id}?inline=1`} target="_blank" rel="noopener" aria-label={`Preview ${f.name}`} className="rounded p-1.5 text-muted hover:bg-hover hover:text-ink"><Eye className="size-4" /></a>
                                ) : null}
                                <a href={`/api/inventions/${row.id}/files/${f.id}`} aria-label={`Download ${f.name}`} className="rounded p-1.5 text-muted hover:bg-hover hover:text-ink"><Download className="size-4" /></a>
                              </>
                            ) : (
                              <Badge tone="neutral" title="Recorded by the drafting workflow; no file content stored">record only</Badge>
                            )}
                            {canDelete ? <DeleteButton compact url={`/api/inventions/${row.id}/files/${f.id}`} label={`Delete ${f.name}`} prompt="Delete file?" /> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {inv ? (
            <Panel>
              <PanelHeader title="Disclosure" />
              <PanelBody>
                <dl className="space-y-4 text-[13px]">
                  {([["Summary", inv.summary], ["Technical field", inv.field], ["Problem", inv.problem], ["Solution", inv.solution]] as const).map(([k, v]) =>
                    v ? (
                      <div key={k}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-faint">{k}</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed text-ink">{v}</dd>
                      </div>
                    ) : null,
                  )}
                  {inv.inventors.length ? (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-faint">Inventors</dt>
                      <dd className="mt-0.5 text-ink">{inv.inventors.map((i) => (i.email ? `${i.name} <${i.email}>` : i.name)).join(", ")}</dd>
                    </div>
                  ) : null}
                </dl>
              </PanelBody>
            </Panel>
          ) : row.summary ? (
            <Panel><PanelHeader title="Instructions" /><PanelBody><p className="text-[13px] text-ink">{row.summary}</p></PanelBody></Panel>
          ) : null}
        </div>

        <aside className="space-y-5">
          {canUpload ? (
            <Panel>
              <PanelHeader title="Add your files" />
              <PanelBody><AddFiles inventionId={row.id} /></PanelBody>
            </Panel>
          ) : null}
          {canDelete && inv ? (
            <Panel>
              <PanelHeader title="Delete" />
              <PanelBody>
                {inWorkflow ? (
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    This invention is in the drafting workflow, so the disclosure itself can't be deleted. Use the bin beside a file to remove individual files.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[12.5px] leading-relaxed text-muted">Removes the disclosure and all its uploaded files. This can't be undone.</p>
                    <DeleteButton url={`/api/inventions/${row.id}`} label="Delete disclosure" redirectTo="/inventions" prompt={`Delete ${row.id} and its files?`} />
                  </div>
                )}
              </PanelBody>
            </Panel>
          ) : null}
          <Panel>
            <PanelHeader title="Where it stands" />
            <PanelBody>
              <dl className="space-y-3 text-[13px]">
                <div><dt className="text-[11px] uppercase tracking-wide text-faint">Raised by</dt><dd className="text-ink">{inv?.createdBy ?? assignment?.assigned_by ?? "—"}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-faint">Drafter</dt><dd className="text-ink">{assignment?.assignee ?? "Not assigned"}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-faint">Claims</dt><dd className="text-ink">{claimStatus ?? "Not started"}</dd></div>
              </dl>
              <div className="mt-4 flex flex-col gap-1.5 text-[12.5px]">
                <Link className="text-accent-text hover:underline" href={`/dashboard/patent-drafter/invention/documents/technical`}>Open in drafter workspace →</Link>
                <Link className="text-accent-text hover:underline" href={`/dashboard/patent-drafter/review/approvals`}>Review & approvals →</Link>
              </div>
            </PanelBody>
          </Panel>
        </aside>
      </div>
    </>
  );
}
