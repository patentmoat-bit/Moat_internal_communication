"use client";

import { AlertCircle, ArrowRight, Lightbulb, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface InsightPanelProps {
  insights: Insight[];
}

export function InsightPanel({ insights }: InsightPanelProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Strategic Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          {insights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-4 p-4 hover:bg-muted/10 transition-colors">
              <div className="mt-0.5">
                {insight.severity === "high" ? (
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                ) : insight.severity === "medium" ? (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{insight.title}</p>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
