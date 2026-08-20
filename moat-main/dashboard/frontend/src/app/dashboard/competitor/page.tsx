import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={18}
      title="Competitor Intelligence"
      status="ready"
      summary="Tracks competitor portfolios, filing velocity, technology themes, assignee behavior, and strategic movement."
      inputs={["Assignee names", "Patent sets", "Date ranges", "Technology filters"]}
      outputs={["Competitor profile", "Trend cards", "Portfolio gaps", "Watchlist events"]}
      engines={["Assignee normalization", "Trend analysis", "Alert routing", "Portfolio clustering"]}
      api="GET /api/v1/competitors/{id}/intelligence"
      data={["patents.assignee", "alerts", "analytics"]}
    />
  );
}
