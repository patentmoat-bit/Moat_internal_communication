"use client";

import React from "react";

export default function DesignTeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
