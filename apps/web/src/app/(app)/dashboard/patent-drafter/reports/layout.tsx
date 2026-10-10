"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Clock, LineChart } from "lucide-react";

export default function ReportsWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString() ? "?" + searchParams.toString() : "";
  
  const tabs = [
    { name: "Drafting Metrics", href: "/dashboard/patent-drafter/reports/drafting-metrics", icon: BarChart3 },
    { name: "Time Tracking", href: "/dashboard/patent-drafter/reports/time-tracking", icon: Clock },
    { name: "Productivity", href: "/dashboard/patent-drafter/reports/productivity", icon: LineChart },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#fdfdfc] dark:bg-background">
      <div className="border-b border-border/40 bg-white/50 dark:bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-black text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your active workload, billable hours, and productivity trends.</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link key={tab.name} href={tab.href + qs}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active 
                      ? "bg-teal-600 text-white shadow-md shadow-teal-500/20" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}>
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
