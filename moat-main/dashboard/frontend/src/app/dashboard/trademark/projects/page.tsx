"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Folder, Search, Filter, Plus, ShieldCheck, Activity, PenTool, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TrademarkProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchProjects() {
      try {
        const res = await fetch("/api/trademarks");
        if (res.ok) {
          const { data } = await res.json();
          if (mounted) setProjects(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch trademark projects", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProjects();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/trademark" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to Trademark Dashboard
        </Link>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Trademark Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage your intellectual property portfolios, track filing statuses, and monitor trademark infringements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#131309] hover:bg-[#b8943d] transition-colors">
            <Plus className="h-4 w-4" /> New Trademark Project
          </button>
        </div>
      </header>

      {/* Projects Table */}
      <Card className="border-border/70 shadow-sm mt-8">
        <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Folder className="h-4 w-4 text-[#c9a84c]" /> Active Portfolios
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search trademarks..." 
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                />
              </div>
              <button className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted shrink-0">
                <Filter className="h-4 w-4" /> Filter
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/40 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Project Details</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Mark Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Owner</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                        Loading trademark projects...
                      </div>
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No trademark projects found. Click "New Trademark Project" to begin.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id} className="group transition-colors hover:bg-muted/10 cursor-pointer">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground hover:text-[#c9a84c] hover:underline transition-colors">{project.name || project.title || "Unnamed Project"}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Ref: {project.id.split('-')[0].toUpperCase()}</span>
                              <span>•</span>
                              <span>{project.jurisdiction || "Global"}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-semibold text-muted-foreground">{project.mark_type || "Word Mark"}</span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={cn(
                          "font-medium px-2 py-0.5",
                          project.status === "Approved" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" :
                          project.status === "Under Review" ? "border-blue-500/30 text-blue-600 bg-blue-500/5" :
                          project.status === "Drafting" ? "border-amber-500/30 text-amber-600 bg-amber-500/5" :
                          "border-border/60 text-muted-foreground"
                        )}>
                          {project.status || "New"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {project.owner || "Patent Analyst"}
                      </td>
                      <td className="px-4 py-4 text-right text-xs text-muted-foreground">
                        {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
