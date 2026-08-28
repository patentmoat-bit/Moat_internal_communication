"use client";

import React from "react";
import { AiHubContext } from "../AiHubWorkspace";
import { Bookmark, DownloadCloud, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";

export default function SavedReportsModule({ context }: { context: AiHubContext }) {
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  React.useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Fetch only required columns instead of select(*). This previously
      // requested description/format/report_data, none of which exist on
      // ai_hub_reports — PostgREST rejects unknown columns, so every fetch
      // errored and this module silently always showed "No reports saved
      // yet." regardless of actual data. version was also missing from the
      // select despite being read below.
      let query = supabase.from("ai_hub_reports").select("id, report_type, title, version, created_at").eq("user_id", userData.user.id).order("created_at", { ascending: false });
      if (context.projectId) query = query.eq("project_id", context.projectId);

      const { data, error } = await query;
      if (!error && data) {
        setReports(data.map(d => ({
          id: d.id,
          title: d.title,
          type: d.report_type,
          date: new Date(d.created_at).toLocaleDateString(),
          version: d.version || "1.0",
        })));
      }
      setLoading(false);
    };
    fetchReports();
  }, [context.projectId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b flex items-center justify-between bg-background">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-indigo-600" />
            Saved Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Access, edit, and export your finalized AI Hub research reports.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/10">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center p-10 text-muted-foreground bg-background rounded-md border border-dashed">No reports saved yet.</div>
        ) : reports.map(report => (
          <div key={report.id} className="bg-background border rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded bg-indigo-50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{report.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{report.type} • {report.date} • Version {report.version}</p>
                <p className="text-xs mt-1 font-semibold text-indigo-600">{context.projectName || "General Context"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" title="Export PDF">
                <DownloadCloud className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm">
                Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
