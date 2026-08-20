"use client";

import { SharedTrademarkDashboard } from "@/components/trademark/SharedTrademarkDashboard";

export default function CeoTrademarkPage() {
  return (
    <SharedTrademarkDashboard 
      basePath="/ceo/trademark"
      backLink="/dashboard/ceo"
      backLabel="Back to CEO Workspace"
    />
  );
}
