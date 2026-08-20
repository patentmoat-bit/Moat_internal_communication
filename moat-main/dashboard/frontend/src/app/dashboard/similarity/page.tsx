import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={12}
      title="Similarity Engine"
      status="live"
      summary="Compares patents, claims, and technical disclosures using feature overlap, semantic relatedness, and claim-level differences."
      inputs={["Source patent", "Target patents", "Disclosure text", "Feature matrix"]}
      outputs={["Similarity score", "Overlap map", "Difference summary", "Comparable patents"]}
      engines={["Semantic embeddings", "Feature extraction", "Claim comparison", "Score calibration"]}
      api="POST /api/v1/ai/similarity"
      data={["patents", "embeddings", "comparison results"]}
    />
  );
}
