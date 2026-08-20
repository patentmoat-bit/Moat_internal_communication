import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={5}
      title="Patent Detail"
      status="live"
      summary="Detailed patent record view with bibliographic data, claims, classifications, family context, citations, and downstream AI actions."
      inputs={["Patent ID", "Patent number", "Saved patent", "Search result"]}
      outputs={["Patent detail", "Claims view", "Classification chips", "AI action links"]}
      engines={["Patent lookup", "Claim normalization", "Citation context", "Related workflow dispatch"]}
      api="GET /api/v1/patents/{patent_id}"
      data={["patents", "saved_patents", "collections"]}
    />
  );
}
