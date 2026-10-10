"use client";
import React from "react";
import { DraftListView } from "@/components/drafts/DraftListView";

export default function DraftsPage() {
  return (
    <div className="p-8 w-full">
      <DraftListView 
        status="completed"
        title="Completed Drafts"
        description="Finalized and approved patent drafts."
      />
    </div>
  );
}
