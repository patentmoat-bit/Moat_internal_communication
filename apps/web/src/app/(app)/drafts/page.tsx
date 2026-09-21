import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Inbox, PenLine } from "lucide-react";
import { Avatar, Badge, EmptyState, Eyebrow, Panel } from "@moat/ui";
import { PageHeader } from "@/components/shell/page-header";
import { StartDraftButton } from "@/components/drafting/start-draft-button";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { landingFor } from "@/components/shell/nav";
import { documentStatusMeta, formatDate } from "@/lib/display";
import { PERMISSIONS, can, type DraftQueueItem, type DraftSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Drafts" };

export default async function DraftsPage() {
  const [drafts, queue, session] = await Promise.all([
    serverApi<DraftSummary[]>("/drafts"),
    serverApi<DraftQueueItem[]>("/drafts/queue"),
    getSession(),
  ]);


  // Permission guard. The API refuses either way; this keeps a boundary from
  // rendering as an empty page. The destination is computed from what this
  // person CAN reach -- a fixed one would bounce them back and loop.
  if (!session?.permissions.includes("document.read")) {
    redirect(landingFor(session?.permissions ?? []));
  }

  const canStart = can(session, PERMISSIONS.documentCreate);

  return (
    <>
      <PageHeader
        title="Drafts"
        caption="Patent specifications being prepared from approved disclosures. A draft only starts once counsel has approved the underlying disclosure."
      />

      <div className="space-y-6 px-6 py-5">
        {/* The drafter's inbox comes first: work waiting to be picked up is
            more urgent than work already in hand. */}
        <section>
          <Eyebrow className="pb-2">Waiting to be drafted</Eyebrow>
          <Panel className="overflow-hidden">
            {(queue ?? []).length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title="Nothing waiting"
                description="Approved disclosures appear here. Counsel approves a disclosure before drafting starts, so a week is never spent on something legal will not file."
              />
            ) : (
              <ul>
                {(queue ?? []).map((item, index) => (
                  <li
                    key={item.inventionId}
                    className={index > 0 ? "border-t border-line" : undefined}
                  >
                    <div className="flex items-start gap-4 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="numeric text-[11px] text-faint">{item.ref}</span>
                          <Badge tone="positive">Approved</Badge>
                          {item.approvedAt ? (
                            <span className="text-[11px] text-faint">
                              {formatDate(item.approvedAt)}
                              {item.reviewer ? ` · ${item.reviewer.name}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="font-document mt-1 text-[15px] font-semibold leading-snug text-ink">
                          {item.title}
                        </h3>
                        <p className="measure mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                          {item.summary}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex -space-x-1.5">
                          {item.contributors.map((person) => (
                            <Avatar
                              key={person.id}
                              name={person.name}
                              size={22}
                              className="ring-2 ring-[var(--surface)]"
                            />
                          ))}
                        </div>
                        {canStart ? <StartDraftButton inventionId={item.inventionId} /> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        <section>
          <Eyebrow className="pb-2">In progress</Eyebrow>
          <Panel className="overflow-hidden">
            {(drafts ?? []).length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No drafts yet"
                description="Start one from an approved disclosure above."
              />
            ) : (
              <ul>
                {(drafts ?? []).map((draft, index) => {
                  const status = documentStatusMeta[draft.status];
                  return (
                    <li key={draft.id} className={index > 0 ? "border-t border-line" : undefined}>
                      <Link
                        href={`/drafts/${draft.id}`}
                        className="block px-4 py-3.5 transition-colors hover:bg-hover"
                      >
                        <div className="flex items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="numeric text-[11px] text-faint">{draft.ref}</span>
                              <Badge tone={status.tone}>{status.label}</Badge>
                              {draft.openErrors > 0 ? (
                                <Badge tone="critical">
                                  {draft.openErrors} error{draft.openErrors === 1 ? "" : "s"}
                                </Badge>
                              ) : null}
                            </div>
                            <h3 className="font-document mt-1 text-[15px] font-semibold leading-snug text-ink">
                              {draft.title}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
                              <span className="numeric">rev {draft.revision}</span>
                              <span aria-hidden>·</span>
                              <span className="numeric">
                                {draft.claimCount} claims ({draft.independentCount} independent)
                              </span>
                              <span aria-hidden>·</span>
                              <span>from {draft.inventionRef}</span>
                              <span aria-hidden>·</span>
                              <span>{draft.jurisdiction}</span>
                              <span aria-hidden>·</span>
                              <span>updated {formatDate(draft.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {draft.drafter ? (
                              <span className="flex items-center gap-1.5">
                                <Avatar name={draft.drafter.name} size={22} />
                                <span className="text-[11.5px] text-muted">
                                  {draft.drafter.name}
                                </span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11.5px] text-faint">
                                <PenLine className="size-3" />
                                unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </section>
      </div>
    </>
  );
}
