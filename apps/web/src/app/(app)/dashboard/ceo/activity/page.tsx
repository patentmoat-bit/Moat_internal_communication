"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, AlertTriangle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ActivityHistoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => {
        setData(json.activities || []);
        setLoading(false);
      })
      .catch((err) => {
        // console.error(err);
        setData(Array.isArray(data) ? [] : {}); setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading CEO data...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="pt-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border dark:border-[#c9a84c]/20 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge
              variant="outline"
              className="border-[#c9a84c]/40 text-[#c9a84c] bg-[#c9a84c]/10 tracking-widest text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm"
            >
              ACTIVITY
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground dark:text-[#e8dfc8]">
            Activity History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#e8dfc8]/60 max-w-2xl font-medium">
            Immutable audit log of CEO actions and system events.
          </p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search activity..." className="pl-9 bg-card border-border" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 text-sm font-bold">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e]">
        <CardContent className="p-0">
          {(!data || data.length === 0) ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No activity history available.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.map((item, idx) => (
                <div key={idx} className="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{item.action}</span>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.details}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
