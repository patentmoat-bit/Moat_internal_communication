"use client";
import React from "react";
import { Calendar } from "lucide-react";
export default function DocketPage() {
  return <div className="p-8 max-w-4xl space-y-4"><h1 className="text-2xl font-black flex items-center gap-2"><Calendar className="w-6 h-6 text-red-500"/> Docket & Deadlines</h1><p className="text-muted-foreground">Track all upcoming target drafting deadlines and statutory filings.</p></div>;
}
