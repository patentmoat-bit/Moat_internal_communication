"use client";
import React from "react";
import { PenTool } from "lucide-react";
export default function DrawingsPage() {
  return <div className="p-8 max-w-4xl space-y-4"><h1 className="text-2xl font-black flex items-center gap-2"><PenTool className="w-6 h-6 text-indigo-500"/> Drawings & Figures</h1><p className="text-muted-foreground">Upload and manage formal patent drawings, flowcharts, and block diagrams.</p></div>;
}
