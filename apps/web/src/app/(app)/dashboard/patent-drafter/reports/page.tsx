"use client";
import React from "react";
import { Search } from "lucide-react";
export default function ReportsPage() {
  return <div className="p-8 max-w-4xl space-y-4"><h1 className="text-2xl font-black flex items-center gap-2"><Search className="w-6 h-6 text-purple-500"/> Draft Reports</h1><p className="text-muted-foreground">View statistical reports on patent draft status, volume, and processing times.</p></div>;
}
