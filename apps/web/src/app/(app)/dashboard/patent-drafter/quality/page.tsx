"use client";
import React from "react";
import { CheckCircle } from "lucide-react";
export default function QualityPage() {
  return <div className="p-8 max-w-4xl space-y-4"><h1 className="text-2xl font-black flex items-center gap-2"><CheckCircle className="w-6 h-6 text-emerald-500"/> Quality Checks</h1><p className="text-muted-foreground">Automated verification of drafting constraints and terminology.</p></div>;
}
