"use client";

import { SharedTrademarkDashboard } from "@/components/trademark/SharedTrademarkDashboard";

export default function AnalystTrademarkPage() {
  return (
    <SharedTrademarkDashboard 
      basePath="/dashboard/trademark"
      backLink="/dashboard/patent-analyst"
      backLabel="Back to Patent Analyst Workspace"
    />
  );
}
