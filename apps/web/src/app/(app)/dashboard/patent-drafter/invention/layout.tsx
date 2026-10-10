"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FileText, Lightbulb, Search, FolderOpen, ArrowLeft } from "lucide-react";

export default function InventionWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") || "NEW_PROJECT";

  const tabs = [
    { name: "Invention Details", href: `/dashboard/patent-drafter/invention/details?id=${id}`, icon: Lightbulb },
    { name: "Technical Information", href: `/dashboard/patent-drafter/invention/technical?id=${id}`, icon: FileText },
    { name: "Research Reference", href: `/dashboard/patent-drafter/invention/research?id=${id}`, icon: Search },
    { name: "Documents", href: `/dashboard/patent-drafter/invention/documents/technical?id=${id}`, icon: FolderOpen },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfdfc] dark:bg-background">
      <div className="border-b border-border/40 bg-white dark:bg-card px-8 py-6 shadow-sm z-10 sticky top-0">
        <div className="max-w-screen-2xl mx-auto">
          <Link href="/dashboard/patent-drafter/drafts/assigned" className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-blue-600 mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Assigned Drafts
          </Link>
          
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-3">
            {tabs.map((tab) => {
              const active = pathname === tab.href.split("?")[0] || pathname.startsWith(tab.href.split("?")[0] + "/");
              return (
                <Link key={tab.name} href={tab.href} className="shrink-0">
                  <div
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      active 
                        ? "bg-blue-600/10 text-blue-700 shadow-sm ring-1 ring-blue-600/20" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${active ? "text-blue-700" : ""}`} />
                    {tab.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 max-w-screen-2xl mx-auto w-full p-8">
        {children}
      </div>
    </div>
  );
}
