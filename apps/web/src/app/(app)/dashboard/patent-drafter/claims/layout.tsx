"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ListOrdered, GitBranch, GitCompare, CheckSquare } from "lucide-react";

export default function ClaimsWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString() ? "?" + searchParams.toString() : "";
  
  const tabs = [
    { name: "Claims Editor", href: "/dashboard/patent-drafter/claims/list" + qs, icon: ListOrdered },
    { name: "Claim Tree", href: "/dashboard/patent-drafter/claims/structure" + qs, icon: GitBranch },
    { name: "Version Comparison", href: "/dashboard/patent-drafter/claims/comparison" + qs, icon: GitCompare },
    { name: "Claim Review", href: "/dashboard/patent-drafter/claims/review" + qs, icon: CheckSquare },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#fdfdfc] dark:bg-background">
      <div className="border-b border-border/40 bg-white/50 dark:bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-black text-foreground">Claim Workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">Draft, visualize, and analyze patent claims.</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
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
      <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
