"use client";
import React from "react";
import { DraftListView } from "@/components/drafts/DraftListView";

export default function DraftsPage() {
  return (
    <div className="p-8 w-full">
      <DraftListView 
        status="in-progress"
        title="In Progress"
        description="Drafting projects currently being worked on."
      />
    </div>
  );
}
