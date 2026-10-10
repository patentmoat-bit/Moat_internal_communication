"use client";
import React from "react";
import { DraftListView } from "@/components/drafts/DraftListView";

export default function DraftsPage() {
  return (
    <div className="p-8 w-full">
      <DraftListView 
        status="assigned"
        title="Assigned to Me"
        description="Projects assigned to you by Patent Analysts or the CEO."
      />
    </div>
  );
}
