import { Construction } from "lucide-react";
import { Badge, EmptyState, Panel } from "@moat/ui";
import { PageHeader } from "./page-header";

/**
 * Honest placeholder. A nav item that leads nowhere is worse than one that
 * says what it will do and when it arrives, so unbuilt surfaces state their
 * phase and their intended scope rather than 404-ing.
 */
export function PlannedSurface({
  title,
  phase,
  scope,
}: {
  title: string;
  phase: number;
  scope: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        meta={<Badge tone="neutral">Planned · phase {phase}</Badge>}
      />
      <div className="px-6 py-5">
        <Panel>
          <EmptyState
            icon={<Construction />}
            title="Not built yet"
            description={scope}
          />
        </Panel>
      </div>
    </>
  );
}
