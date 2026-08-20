"use client";

import { DashboardShell } from "./DashboardShell";
import type { EnterpriseRole } from "@/lib/roleIntelligence";

export function RoleWorkspace({ role }: { role: EnterpriseRole }) {
  return <DashboardShell role={role} />;
}
