"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Briefcase, Clock, Search, CheckCircle, FilePenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DraftingWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const tabs = [
    { name: "My Drafts", href: "/dashboard/patent-drafter/drafts/my-drafts", icon: FileText },
    { name: "Assigned to Me", href: "/dashboard/patent-drafter/drafts/assigned", icon: Briefcase },
    { name: "In Progress", href: "/dashboard/patent-drafter/drafts/in-progress", icon: FilePenLine },
    { name: "Under Review", href: "/dashboard/patent-drafter/drafts/under-review", icon: Search },
    { name: "Completed", href: "/dashboard/patent-drafter/drafts/completed", icon: CheckCircle },
  ];

  // If the path is exactly /drafts/assigned, we might want to wrap it.
  // Wait, /drafts/assigned already has its own full hero header.
  // If we wrap it, we will have a double header. Let's just output children and render the tab bar globally for all drafts if they aren't 'assigned', or let's just make the tab bar floating or integrate it.
  // Since assigned/page.tsx already has a beautiful hero header, maybe we just leave it alone and not force a layout?
  // Let's implement the layout without forcing a huge header, just a subtle tab bar at the top!

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfdfc] dark:bg-background">
      <div className="border-b border-border/40 bg-white/50 dark:bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link key={tab.name} href={tab.href} className="shrink-0">
                  <div
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                      active 
                        ? "bg-[#c9a84c]/15 text-[#c9a84c] shadow-sm ring-1 ring-[#c9a84c]/30" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${active ? "text-[#c9a84c]" : ""}`} />
                    {tab.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="flex-1 w-full">
        {children}
      </div>
    </div>
  );
}
