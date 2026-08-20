import { ModuleWorkbench } from "@/components/modules/ModuleWorkbench";

export default function Page() {
  return (
    <ModuleWorkbench
      index={11}
      title="Patent Copilot"
      status="live"
      summary="Conversational assistant for patent search, claim review, workspace navigation, reports, and technical reasoning."
      inputs={["User question", "Workspace context", "Patent context", "Selected evidence"]}
      outputs={["Answer", "Suggested actions", "Referenced sources", "Follow-up prompts"]}
      engines={["Context assembly", "Tool routing", "LLM response generation", "Source grounding"]}
      api="POST /api/v1/ai/chat"
      data={["patents", "workspaces", "collections", "reports"]}
    />
  );
}
