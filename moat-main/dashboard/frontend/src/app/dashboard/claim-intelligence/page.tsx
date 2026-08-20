import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={8}
      title="Claim Intelligence"
      status="ready"
      summary="Transforms claim sets into structured limitations, dependencies, novelty cues, and comparison-ready claim maps."
      inputs={["Independent claims", "Dependent claims", "Patent text", "Target product notes"]}
      outputs={["Claim chart", "Element map", "Dependency tree", "Limitation summary"]}
      engines={["Claim parsing", "Element extraction", "Dependency resolution", "Chart generation"]}
      api="POST /api/v1/claim-intelligence/analyze"
      data={["patents.claims", "claim elements", "workspace evidence"]}
    />
  );
}
