"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Download, AlertTriangle } from "lucide-react";

export default function ExecutiveReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => {
        setData(json);
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
              REPORTS
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground dark:text-[#e8dfc8]">
            Executive Reports
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#175a74] text-white rounded-lg hover:bg-[#114459] text-sm font-bold">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e]">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground dark:text-[#e8dfc8]">
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(data && data.summary) || "No data available."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
