"use client";

import React from "react";

export default function PatentDrafterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </div>
    </div>
  );
}
