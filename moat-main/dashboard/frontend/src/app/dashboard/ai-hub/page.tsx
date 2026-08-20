import { Metadata } from "next";
import { Suspense } from "react";
import { AIAssistantLayout } from "@/components/ai/AIAssistantLayout";
import { LoadingState } from "@/components/shared/LoadingState";
import AiHubWorkspace from "@/components/ai-hub/AiHubWorkspace";

export const metadata: Metadata = {
  title: "MOAT AI HUB - Intelligence Workspace",
  description: "Enterprise AI workspace for Patent, Trademark, and Copyright intelligence",
};

export default function AiHubPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      <Suspense fallback={<div className="w-full h-[60vh] flex items-center justify-center"><LoadingState message="Loading AI Hub..." /></div>}>
        <AiHubWorkspace />
      </Suspense>
    </div>
  );
}
