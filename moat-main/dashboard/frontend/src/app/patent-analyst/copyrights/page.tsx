"use client";

import { SharedCopyrightDashboard } from "@/components/shared/SharedCopyrightDashboard";

export default function PatentAnalystCopyrightsPage() {
  return (
    <SharedCopyrightDashboard 
      backHref="/dashboard/patent-analyst" 
      backLabel="Analyst Workspace" 
    />
  );
}
