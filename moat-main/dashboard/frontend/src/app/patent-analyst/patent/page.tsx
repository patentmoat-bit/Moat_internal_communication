"use client";

import { SharedPatentDashboard } from "@/components/shared/SharedPatentDashboard";

export default function PatentAnalystPatentPage() {
  return (
    <SharedPatentDashboard 
      backHref="/dashboard/patent-analyst" 
      backLabel="Analyst Workspace" 
    />
  );
}
