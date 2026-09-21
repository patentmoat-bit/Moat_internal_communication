import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge } from "@moat/ui";
import { PageHeader } from "@/components/shell/page-header";
import { DraftingStudio } from "@/components/drafting/drafting-studio";
import { ExportMenu } from "@/components/drafting/export-menu";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { documentStatusMeta, formatDate } from "@/lib/display";
import {
  PERMISSIONS,
  can,
  type DraftDetail,
  type Drawing,
  type DrawingsSummary,
} from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const draft = await serverApi<DraftDetail>(`/drafts/${id}`);
  return { title: draft?.ref ?? "Draft" };
}

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, session, drawings, drawingsSummary] = await Promise.all([
    serverApi<DraftDetail>(`/drafts/${id}`),
    getSession(),
    serverApi<Drawing[]>(`/drafts/${id}/drawings`),
    serverApi<DrawingsSummary>(`/drafts/${id}/drawings/summary`),
  ]);

  if (!draft) notFound();

  const status = documentStatusMeta[draft.status];
  const claimSet = draft.claimSet;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Drafts", href: "/drafts" }, { label: draft.ref }]}
        title={draft.title}
        meta={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="numeric text-[12px] text-faint">revision {draft.revision}</span>
            {claimSet ? (
              <span className="numeric text-[12px] text-faint">
                claim set {claimSet.revision}
                {claimSet.frozenAt ? " · frozen" : ""}
              </span>
            ) : null}
            {draft.drafter ? (
              <span className="flex items-center gap-1.5">
                <Avatar name={draft.drafter.name} size={20} />
                <span className="text-[12px] text-muted">{draft.drafter.name}</span>
              </span>
            ) : null}
            <Link
              href={`/inventions/${draft.inventionId}`}
              className="text-[12px] text-accent-text hover:underline"
            >
              from {draft.inventionRef}
            </Link>
            <span className="text-[12px] text-faint">
              updated {formatDate(draft.updatedAt)}
            </span>
          </>
        }
        actions={
          can(session, PERMISSIONS.documentExport) ? <ExportMenu documentId={draft.id} /> : null
        }
        caption={
          claimSet?.frozenAt
            ? `Claim set ${claimSet.revision} was submitted and is now immutable. Editing it starts revision ${claimSet.revision + 1}, leaving the reviewed set intact.`
            : status.description
        }
      />

      <DraftingStudio
        draft={draft}
        canEdit={can(session, PERMISSIONS.documentUpdate)}
        canDecide={can(session, PERMISSIONS.decisionCreate)}
        canRequestDrawing={can(session, PERMISSIONS.drawingRequest)}
        canReviewDrawing={can(session, PERMISSIONS.drawingReview)}
        drawings={drawings ?? []}
        drawingsSummary={drawingsSummary}
      />
    </>
  );
}
