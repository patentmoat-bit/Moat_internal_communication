import type { Metadata } from "next";
import Link from "next/link";
import { FileSearch, Lightbulb, Plus } from "lucide-react";
import { Avatar, Badge, Button, EmptyState, Panel } from "@moat/ui";
import { PageHeader } from "@/components/shell/page-header";
import { InventionFilters } from "@/components/invention/invention-filters";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { landingFor } from "@/components/shell/nav";
import { formatDate, statusMeta } from "@/lib/display";
import { PERMISSIONS, can, type InventionSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Inventions" };

export default async function InventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();


  // Permission guard. The API refuses either way; this keeps a boundary from
  // rendering as an empty page. The destination is computed from what this
  // person CAN reach -- a fixed one would bounce them back and loop.
  if (!session?.permissions.includes("invention.read")) {
    redirect(landingFor(session?.permissions ?? []));
  }

  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.mine === "1") query.set("mine", "true");
  const suffix = query.size ? `?${query}` : "";

  const inventions = (await serverApi<InventionSummary[]>(`/inventions${suffix}`)) ?? [];

  return (
    <>
      <PageHeader
        title="Inventions"
        caption="Disclosures raised in this workspace. A disclosure is unpublished and confidential until counsel decides otherwise — treat everything here as a trade secret."
        actions={
          can(session, PERMISSIONS.inventionCreate) ? (
            <Button variant="primary" size="lg" asChild>
              <Link href="/inventions/new">
                <Plus />
                New disclosure
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="px-6 py-5">
        <InventionFilters />

        {inventions.length === 0 ? (
          <Panel className="mt-4">
            <EmptyState
              icon={<Lightbulb />}
              title="No disclosures here yet"
              description="Raise one as soon as an idea is worth protecting — before it appears in a paper, a talk, or a public repository."
              action={
                can(session, PERMISSIONS.inventionCreate) ? (
                  <Button variant="primary" size="sm" asChild>
                    <Link href="/inventions/new">
                      <Plus />
                      New disclosure
                    </Link>
                  </Button>
                ) : null
              }
            />
          </Panel>
        ) : (
          <Panel className="mt-4 overflow-hidden">
            <ul>
              {inventions.map((invention, index) => {
                const status = statusMeta[invention.status];
                const staleEvidence =
                  invention.evidenceRevision !== null &&
                  invention.evidenceRevision !== invention.revision;

                return (
                  <li
                    key={invention.id}
                    className={index > 0 ? "border-t border-line" : undefined}
                  >
                    <Link
                      href={`/inventions/${invention.id}`}
                      className="block px-4 py-3.5 transition-colors hover:bg-hover"
                    >
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="numeric text-[11px] tracking-tight text-faint">
                              {invention.ref}
                            </span>
                            <Badge tone={status.tone}>{status.label}</Badge>
                            {staleEvidence ? (
                              <Badge
                                tone="caution"
                                title={`Evidence was gathered against revision ${invention.evidenceRevision}`}
                              >
                                Evidence out of date
                              </Badge>
                            ) : null}
                          </div>

                          <h3 className="font-document mt-1 text-[15px] font-semibold leading-snug tracking-[-0.008em] text-ink">
                            {invention.title}
                          </h3>

                          <p className="measure mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                            {invention.summary}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
                            <span className="numeric">rev {invention.revision}</span>
                            <span aria-hidden>·</span>
                            <span>updated {formatDate(invention.updatedAt)}</span>
                            {invention.evidenceCount > 0 ? (
                              <>
                                <span aria-hidden>·</span>
                                <span className="inline-flex items-center gap-1">
                                  <FileSearch className="size-3" />
                                  {invention.evidenceCount} passages retrieved
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <div className="flex -space-x-1.5">
                            {invention.contributors.map((person) => (
                              <Avatar
                                key={person.id}
                                name={person.name}
                                size={22}
                                className="ring-2 ring-[var(--surface)]"
                              />
                            ))}
                          </div>
                          <div className="flex flex-wrap justify-end gap-1">
                            {invention.classifications.slice(0, 2).map((code) => (
                              <span
                                key={code}
                                className="numeric rounded-[var(--radius-xs)] bg-sunken px-1.5 py-0.5 text-[10.5px] text-faint"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
