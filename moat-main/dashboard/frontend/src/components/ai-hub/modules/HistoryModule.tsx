"use client";

import React from "react";
import { AiHubContext } from "../AiHubWorkspace";
import { History, ArrowRight, Search, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";

export default function HistoryModule({ context, onLoadSearch }: { context: AiHubContext, onLoadSearch: (id: string) => void }) {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  React.useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Phase 9 Optimization: Fetch only required columns instead of select(*)
      let query = supabase.from("ai_hub_searches").select("id, search_type, created_at, input_description, query").eq("user_id", userData.user.id).order("created_at", { ascending: false });
      if (context.projectId) query = query.eq("project_id", context.projectId);

      const { data, error } = await query;
      if (!error && data) {
        setHistory(data.map(d => ({
          id: d.id,
          type: d.search_type,
          date: new Date(d.created_at).toLocaleString(),
          query: d.input_description || d.query || "No query description",
        })));
      }
      setLoading(false);
    };
    fetchHistory();
  }, [context.projectId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b flex items-center justify-between bg-background">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            Search History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review your past AI Hub research sessions and continue where you left off.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/10">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <div className="text-center p-10 text-muted-foreground bg-background rounded-md border border-dashed">No history found.</div>
        ) : history.map(item => (
          <div key={item.id} className="bg-background border rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded bg-indigo-50 flex items-center justify-center shrink-0">
                {item.type.includes("Patentability") ? <FileText className="h-5 w-5 text-indigo-500" /> : <Search className="h-5 w-5 text-indigo-500" />}
              </div>
              <div>
                <h3 className="font-bold text-sm">{item.type}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.date} • {context.projectName || "General Context"}</p>
                <p className="text-sm mt-2 font-mono text-muted-foreground line-clamp-1">{item.query}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onLoadSearch("patentability")}>
              Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
