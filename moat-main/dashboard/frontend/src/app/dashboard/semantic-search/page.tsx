import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={10}
      title="Semantic Search"
      status="ready"
      summary="Embeddings-first patent discovery for technical concepts, invention disclosures, claim elements, and prior-art hypotheses."
      inputs={["Natural-language query", "Disclosure text", "Claim phrase", "Filters"]}
      outputs={["Semantic matches", "Similarity score", "Concept overlap", "Search history"]}
      engines={["Embedding generation", "Vector search", "Hybrid filters", "Result ranking"]}
      api="POST /api/v1/ai/semantic-search"
      data={["Weaviate", "patent embeddings", "search_history"]}
    />
  );
}
