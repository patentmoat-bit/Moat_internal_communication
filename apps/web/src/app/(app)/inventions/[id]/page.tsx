import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, Badge, Eyebrow, Panel, PanelBody, PanelHeader } from "@moat/ui";
import { PageHeader } from "@/components/shell/page-header";
import { EvidencePanel } from "@/components/invention/evidence-panel";
import { InventionActions } from "@/components/invention/invention-actions";
import { DecisionForm } from "@/components/invention/decision-form";
import { DocumentUpload } from "@/components/invention/document-upload";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { formatDate, statusMeta } from "@/lib/display";
import { PERMISSIONS, can, type InventionDetail, type SourceDocument } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const invention = await serverApi<InventionDetail>(`/inventions/${id}`);
  return { title: invention?.ref ?? "Disclosure" };
}

export default async function InventionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invention, session, documents] = await Promise.all([
    serverApi<InventionDetail>(`/inventions/${id}`),
    getSession(),
    serverApi<SourceDocument[]>(`/inventions/${id}/documents`),
  ]);

  // The API answers 404 for another tenant's disclosure as well as for one
  // that does not exist, so this page cannot confirm that an id is real
  // somewhere else.
  if (!invention) notFound();

  const status = statusMeta[invention.status];
  const decision = invention.decision;
  const awaitingReview = invention.status === "submitted" || invention.status === "in_review";
  const canDecide = can(session, PERMISSIONS.decisionCreate);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Inventions", href: "/inventions" }, { label: invention.ref }]}
        title={invention.title}
        meta={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="numeric text-[12px] text-faint">revision {invention.revision}</span>
            <span className="flex items-center gap-1.5">
              {invention.contributors.map((person) => (
                <span key={person.id} className="flex items-center gap-1.5">
                  <Avatar name={person.name} size={20} />
                  <span className="text-[12px] text-muted">{person.name}</span>
                </span>
              ))}
            </span>
            <span className="text-[12px] text-faint">
              updated {formatDate(invention.updatedAt)}
            </span>
          </>
        }
        actions={<InventionActions invention={invention} />}
      />

      <div className="grid grid-cols-1 items-start gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Disclosure"
              caption={`${status.description} Created ${formatDate(invention.createdAt)}.`}
            />
            <PanelBody className="space-y-6 px-6 py-6">
              <section>
                <Eyebrow className="pb-1.5">Summary</Eyebrow>
                <p className="font-document measure text-[15px] leading-[1.7] text-ink">
                  {invention.summary || <span className="text-faint">Not written yet.</span>}
                </p>
              </section>

              {invention.problem ? (
                <section>
                  <Eyebrow className="pb-1.5">Problem addressed</Eyebrow>
                  <p className="font-document measure whitespace-pre-wrap text-[15px] leading-[1.7] text-ink">
                    {invention.problem}
                  </p>
                </section>
              ) : null}

              {invention.description ? (
                <section>
                  <Eyebrow className="pb-1.5">Technical description</Eyebrow>
                  <p className="font-document measure whitespace-pre-wrap text-[15px] leading-[1.7] text-ink">
                    {invention.description}
                  </p>
                </section>
              ) : null}

              {invention.classifications.length > 0 ? (
                <section>
                  <Eyebrow className="pb-1.5">Classification</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {invention.classifications.map((code) => (
                      <span
                        key={code}
                        className="numeric rounded-[var(--radius-xs)] border border-line bg-sunken px-2 py-0.5 text-[11.5px] text-muted"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </PanelBody>
          </Panel>

          {decision ? (
            <Panel>
              <PanelHeader
                title="Review decision"
                caption={`Recorded against revision ${decision.revision}`}
              />
              <PanelBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      decision.outcome === "approved"
                        ? "positive"
                        : decision.outcome === "returned"
                          ? "caution"
                          : "critical"
                    }
                  >
                    {decision.outcome === "approved"
                      ? "Approved"
                      : decision.outcome === "returned"
                        ? "Returned for changes"
                        : "Rejected"}
                  </Badge>
                  <span className="flex items-center gap-1.5">
                    <Avatar name={decision.reviewer.name} size={20} />
                    <span className="text-[12px] text-muted">{decision.reviewer.name}</span>
                  </span>
                  <span className="text-[12px] text-faint">{formatDate(decision.decidedAt)}</span>
                </div>

                <p className="font-document measure text-[14px] leading-relaxed text-ink">
                  {decision.rationale}
                </p>

                {decision.superseded ? (
                  <p className="rounded-[var(--radius-sm)] border border-caution/25 bg-caution-soft px-3 py-2 text-[11.5px] leading-relaxed text-caution">
                    The disclosure has changed since this decision. It applies to revision{" "}
                    {decision.revision} only and does not carry forward to revision{" "}
                    {invention.revision}.
                  </p>
                ) : null}
              </PanelBody>
            </Panel>
          ) : null}

          <DocumentUpload
            inventionId={invention.id}
            documents={documents ?? []}
            canUpload={can(session, PERMISSIONS.inventionUpdate)}
          />

          {canDecide && awaitingReview ? <DecisionForm invention={invention} /> : null}
        </div>

        <EvidencePanel
          analysis={invention.latestAnalysis}
          currentRevision={invention.revision}
          canRun={can(session, PERMISSIONS.analysisRun)}
          inventionId={invention.id}
        />
      </div>
    </>
  );
}
