import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={9}
      title="Evidence Engine"
      status="ready"
      summary="Collects, scores, and links evidence snippets from patents, PDFs, images, search results, and analyst notes."
      inputs={["Patent snippets", "PDF text", "Image OCR", "Analyst notes", "URLs"]}
      outputs={["Evidence cards", "Source trace", "Relevance score", "Exportable packet"]}
      engines={["Source extraction", "Relevance scoring", "Citation binding", "Evidence packet assembly"]}
      api="POST /api/v1/evidence/build"
      data={["evidence_items", "audit_logs", "reports"]}
    />
  );
}
