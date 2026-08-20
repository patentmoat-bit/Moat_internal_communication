"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Lightbulb, CheckSquare, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InsightDef, InsightCategory } from "@/lib/dashboardEngine";
import { cn } from "@/lib/utils";

interface AIInsightPanelProps {
  insights: InsightDef[];
}

export function AIInsightPanel({ insights }: AIInsightPanelProps) {
  const [activeTab, setActiveTab] = useState<InsightCategory>("alert");

  const categories: { key: InsightCategory; label: string; icon: any }[] = [
    { key: "alert", label: "Alerts", icon: ShieldAlert },
    { key: "opportunity", label: "Opportunities", icon: Lightbulb },
    { key: "action", label: "Actions", icon: CheckSquare },
  ];

  const filteredInsights = insights.filter((ins) => ins.category === activeTab);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "high":
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      case "medium":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "opportunity":
        return <Lightbulb className="h-4 w-4 text-amber-400" />;
      case "action":
        return <CheckSquare className="h-4 w-4 text-emerald-400" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
    }
  };

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-2 pt-4 px-5 border-b border-border/40 bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-[#c9a84c]" />
          AI Insight Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Tab Buttons */}
        <div className="flex border-b border-border/30 bg-muted/5">
          {categories.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = insights.filter((ins) => ins.category === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 border-transparent",
                  isActive ? "text-[#c9a84c] border-b-[#c9a84c]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", isActive ? "text-[#c9a84c]" : "text-muted-foreground/60")} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ml-0.5",
                    isActive ? "bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/20" : "bg-muted text-muted-foreground border-border"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Insight Items */}
        <div className="p-3 min-h-[220px]">
          <AnimatePresence mode="wait">
            {filteredInsights.length > 0 ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-2.5"
              >
                {filteredInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="group relative flex flex-col p-3 rounded-lg border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">{getCategoryIcon(insight.category)}</div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-snug">{insight.title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground/85 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border shrink-0", getSeverityStyle(insight.severity))}>
                        {insight.severity}
                      </span>
                    </div>

                    {insight.cta && (
                      <div className="mt-2.5 self-end">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-bold text-[#c9a84c] hover:text-[#b8943d] hover:bg-[#c9a84c]/5 px-2 gap-1 group-hover:translate-x-0.5 transition-transform"
                        >
                          {insight.ctaHref ? (
                            <Link href={insight.ctaHref}>
                              <span>{insight.cta}</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </Link>
                          ) : (
                            <div>
                              <span>{insight.cta}</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`empty-${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center h-[220px] text-muted-foreground"
              >
                <span className="text-xs font-semibold">No active insights in this category</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
