"use client";
import React from "react";
import { Inbox } from "lucide-react";
export default function InboxPage() {
  return <div className="p-8 max-w-4xl space-y-4"><h1 className="text-2xl font-black flex items-center gap-2"><Inbox className="w-6 h-6 text-blue-500"/> Command Inbox</h1><p className="text-muted-foreground">Action items, review feedback, and messages.</p></div>;
}
