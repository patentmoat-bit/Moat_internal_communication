"use client";
import React from "react";
import { DraftListView } from "@/components/drafts/DraftListView";

export default function DraftsPage() {
  return (
    <div className="p-8 w-full">
      <DraftListView 
        status="my-drafts"
        title="My Drafts"
        description="Manage your active drafting projects and templates."
      />
    </div>
  );
}
