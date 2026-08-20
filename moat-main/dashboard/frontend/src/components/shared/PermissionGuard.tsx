"use client";

import React, { ReactNode } from "react";
import { ErrorState } from "./ErrorState";
import { useApp } from "@/lib/store";

interface PermissionGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export function PermissionGuard({ children, allowedRoles, fallback }: PermissionGuardProps) {
  const { user } = useApp();
  
  // Extract role from standard user object, local storage format, or Supabase metadata
  const userRole = user?.role || user?.user_metadata?.role || "guest";
  
  // Example map to handle uppercase/lowercase variations
  const isAllowed = allowedRoles.some(role => 
    role.toLowerCase() === userRole.toLowerCase() || 
    userRole.toLowerCase() === "admin" ||
    userRole.toLowerCase() === "superadmin"
  );

  if (!isAllowed) {
    if (fallback !== undefined) return <>{fallback}</>;
    
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <ErrorState 
          title="Access Denied" 
          message="You don't have permission to perform this action."
        />
      </div>
    );
  }

  return <>{children}</>;
}
