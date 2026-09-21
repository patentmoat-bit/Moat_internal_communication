import type { Metadata } from "next";
import { PenTool } from "lucide-react";
import { EmptyState, Panel } from "@moat/ui";
import { PageHeader } from "@/components/shell/page-header";
import { DrawingCard } from "@/components/design/drawing-card";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { landingFor } from "@/components/shell/nav";
import { PERMISSIONS, can, type Drawing } from "@/lib/types";

export const metadata: Metadata = { title: "Drawings" };

export default async function DesignPage() {
  const [queue, session] = await Promise.all([
    serverApi<Drawing[]>("/drawings/queue"),
    getSession(),
  ]);


  // Permission guard. The API refuses either way; this keeps a boundary from
  // rendering as an empty page. The destination is computed from what this
  // person CAN reach -- a fixed one would bounce them back and loop.
  if (!session?.permissions.includes("drawing.read")) {
    redirect(landingFor(session?.permissions ?? []));
  }

  const canUpload = can(session, PERMISSIONS.drawingUpload);
  const canReview = can(session, PERMISSIONS.drawingReview);
  const drawings = queue ?? [];

  return (
    <>
      <PageHeader
        title="Drawings"
        caption="Figures requested by drafters. Unassigned work is visible to the whole team, so a figure never waits on one person being available."
      />

      <div className="px-6 py-5">
        {drawings.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<PenTool />}
              title="Nothing waiting"
              description="When a drafter asks for a figure it appears here with their brief. Approved figures drop off the queue."
            />
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {drawings.map((drawing) => (
              <DrawingCard
                key={drawing.id}
                drawing={drawing}
                canUpload={canUpload}
                canReview={canReview}
                showDocument
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
