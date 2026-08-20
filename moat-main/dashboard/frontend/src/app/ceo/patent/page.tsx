"use client";

import { SharedPatentDashboard } from "@/components/shared/SharedPatentDashboard";

export default function CeoPatentPage() {
  return (
    <SharedPatentDashboard 
      backHref="/dashboard/ceo" 
      backLabel="CEO Workspace" 
    />
  );
}
