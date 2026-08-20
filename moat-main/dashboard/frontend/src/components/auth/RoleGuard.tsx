"use client";

import type { AppRole } from "@/types";
import { AuthGuard } from "./AuthGuard";

export function RoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: AppRole[];
}) {
  return <AuthGuard allowedRoles={roles}>{children}</AuthGuard>;
}

// ── Convenience Guards ──────────────────────────────────────────────────────

export const AdminGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["Admin", "Super Admin"]}>{children}</RoleGuard>
);

export const CEOGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["CEO"]}>{children}</RoleGuard>
);

export const CTOGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["CTO", "Admin"]}>{children}</RoleGuard>
);

export const CIOGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["CIO", "Admin"]}>{children}</RoleGuard>
);

export const ChiefIPGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["Chief IP Officer", "Admin"]}>{children}</RoleGuard>
);

export const AnalystGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["Patent Analyst", "Admin"]}>{children}</RoleGuard>
);

export const InventorGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["Inventor", "Admin"]}>{children}</RoleGuard>
);

export const BizDevGuard = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={["Business Development", "Admin"]}>{children}</RoleGuard>
);

/** Any authenticated user (still requires login). */
export const AnyRoleGuard = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard>{children}</AuthGuard>
);
