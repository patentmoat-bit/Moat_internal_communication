"use client";

import { SharedTrademarkDashboard } from "@/components/trademark/SharedTrademarkDashboard";

export default function PatentAnalystTrademarkPage() {
  return (
    <SharedTrademarkDashboard 
      basePath="/patent-analyst/trademark"
      backLink="/dashboard/patent-analyst"
      backLabel="Back to Analyst Workspace"
    />
  );
}
