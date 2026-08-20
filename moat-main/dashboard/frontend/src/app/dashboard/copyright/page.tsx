"use client";

import Link from "next/link";
import { ChevronRight, BookmarkPlus, Folder, Search, FileText, Activity, PenTool, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CopyrightDashboardPage() {
  const recentRegistrations = [
    { id: "CR-9201", title: "MOAT Brand Guidelines v2", type: "Literary Work", status: "Registered", date: "Oct 12, 2026" },
    { id: "CR-9104", title: "Quantum Engine Source Code", type: "Computer Program", status: "Pending", date: "Sep 28, 2026" },
    { id: "CR-9055", title: "Product UI/UX Vectors", type: "Visual Arts", status: "Under Review", date: "Sep 15, 2026" },
  ];

  const quickLinks = [
    { href: "/dashboard/copyright/projects", label: "Copyright Projects", icon: Folder, description: "Manage copyright portfolios and IP collections." },
    { href: "/dashboard/copyright/assets", label: "Asset Management", icon: BookmarkPlus, description: "Track original works, source code, and media assets." },
    { href: "/dashboard/copyright/search", label: "Copyright Search", icon: Search, description: "Search the global copyright registry database." },
    { href: "/dashboard/copyright/registration", label: "Registration Tracker", icon: PenTool, description: "Monitor active filing statuses with the USCO." },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-purple-700">Copyright IP Module</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Copyright Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Central command for managing creative assets, tracking registration lifecycles, and enforcing copyright protections across your intellectual property portfolio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#131309] hover:bg-[#b8943d] transition-colors">
            <PenTool className="h-4 w-4" /> New Registration
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Main Content Area (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-[#c9a84c]" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {quickLinks.map((link) => (
                  <Link href={link.href} key={link.href}>
                    <div className="group flex flex-col justify-between h-full p-4 rounded-xl border border-border/50 bg-muted/5 hover:bg-muted/20 hover:border-[#c9a84c]/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <link.icon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-[#c9a84c] transition-colors">{link.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-13">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#c9a84c]" /> Recent Registrations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="p-4 hover:bg-muted/10 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-[#c9a84c] transition-colors truncate pr-4">
                        {reg.title}
                      </h4>
                      <Badge variant="outline" className={
                        reg.status === "Registered" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[10px] px-1.5 py-0" :
                        reg.status === "Pending" ? "border-amber-500/30 text-amber-600 bg-amber-500/5 text-[10px] px-1.5 py-0" :
                        "border-blue-500/30 text-blue-600 bg-blue-500/5 text-[10px] px-1.5 py-0"
                      }>
                        {reg.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" /> {reg.type}
                      </span>
                      <span>{reg.date}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border/40 bg-muted/5">
                <Link href="/dashboard/copyright/registration" className="text-xs font-semibold text-[#c9a84c] hover:underline flex items-center justify-center gap-1">
                  View All Registrations <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
