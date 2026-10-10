"use client";
import React from "react";
import { DraftListView } from "@/components/drafts/DraftListView";

export default function DraftsPage() {
  return (
    <div className="p-8 w-full">
      <DraftListView 
        status="under-review"
        title="Under Review"
        description="Projects submitted for Analyst or legal review."
      />
    </div>
  );
}
