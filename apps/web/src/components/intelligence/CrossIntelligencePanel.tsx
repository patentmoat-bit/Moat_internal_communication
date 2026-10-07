"use client";

import React from "react";
import { GitMerge, ArrowRight, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CrossIntelligenceCorrelation } from "@/types/intelligence";

interface CrossPanelProps {
  correlations?: CrossIntelligenceCorrelation[];
}

export function CrossIntelligencePanel({ correlations }: CrossPanelProps) {
  if (!correlations || correlations.length === 0) return null;

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-purple-400" />
            Cross-Intelligence Correlation Engine
          </CardTitle>
          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300 bg-purple-500/10">
            Automated Synthesis
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {correlations.map((corr) => (
          <div 
            key={corr.id} 
            className="p-3.5 rounded-lg border border-border/40 bg-muted/30 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-foreground">
                {corr.title}
              </h4>
              <Badge variant={corr.risk_level === "HIGH" ? "destructive" : "default"} className="text-xs">
                RISK: {corr.risk_level}
              </Badge>
            </div>

            {/* Horizontal or Wrap Step Flow */}
            <div className="flex flex-wrap items-center gap-2 py-1">
              {corr.chain.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="p-2 rounded bg-background/80 border border-border/50 text-xs min-w-[140px] max-w-[200px]">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">
                      {step.module} • {step.step}
                    </div>
                    <div className="text-xs text-foreground/90 line-clamp-2" title={step.detail}>
                      {step.detail}
                    </div>
                  </div>
                  {idx < corr.chain.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Opportunity & Recommended Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/30">
              <div className="flex items-start gap-1.5 text-teal-300">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-400" />
                <span><strong className="text-teal-400">Opportunity:</strong> {corr.opportunity_potential}</span>
              </div>
              <div className="flex items-start gap-1.5 text-primary">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                <span><strong className="text-primary font-semibold">Recommended Action:</strong> {corr.recommended_action}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
