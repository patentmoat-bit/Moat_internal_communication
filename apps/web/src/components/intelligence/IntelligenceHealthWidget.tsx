"use client";

import React from "react";
import { 
  Sparkles, Building2, TrendingUp, Globe2, 
  Lightbulb, Scale, ShieldCheck, Compass, Activity 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StrategicIntelligenceHealth, IntelligenceModuleType } from "@/types/intelligence";

const MODULE_NODES: Array<{
  key: keyof StrategicIntelligenceHealth;
  label: string;
  moduleType: IntelligenceModuleType;
  icon: React.ElementType;
}> = [
  { key: "ip", label: "IP", moduleType: "IP", icon: Sparkles },
  { key: "competition", label: "Competition", moduleType: "COMPETITIVE", icon: Building2 },
  { key: "technology", label: "Technology", moduleType: "TECHNOLOGY", icon: TrendingUp },
  { key: "market", label: "Market", moduleType: "MARKET", icon: Globe2 },
  { key: "innovation", label: "Innovation", moduleType: "INNOVATION", icon: Lightbulb },
  { key: "regulatory", label: "Regulatory", moduleType: "REGULATORY", icon: Scale },
  { key: "portfolio", label: "Portfolio", moduleType: "PORTFOLIO", icon: ShieldCheck },
  { key: "white_space", label: "White Space", moduleType: "WHITE_SPACE", icon: Compass },
];

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  Stable: { dot: "bg-blue-400", text: "text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
  Attention: { dot: "bg-amber-400 animate-pulse", text: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  Emerging: { dot: "bg-purple-400", text: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  Positive: { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  Strong: { dot: "bg-cyan-400", text: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/20" },
  Monitor: { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
  Opportunity: { dot: "bg-teal-400", text: "text-teal-300", bg: "bg-teal-500/10 border-teal-500/20" },
  Critical: { dot: "bg-red-500 animate-ping", text: "text-red-300", bg: "bg-red-500/10 border-red-500/20" },
};

interface HealthWidgetProps {
  health?: StrategicIntelligenceHealth;
  activeModule?: IntelligenceModuleType | "ALL";
  onSelectModule?: (mod: IntelligenceModuleType | "ALL") => void;
}

export function IntelligenceHealthWidget({ health, activeModule, onSelectModule }: HealthWidgetProps) {
  if (!health) return null;

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Strategic Intelligence Health
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            8/8 Signals Active
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {MODULE_NODES.map(({ key, label, moduleType, icon: Icon }) => {
            const node = health[key];
            const status = node?.status || "Stable";
            const style = STATUS_STYLES[status] || STATUS_STYLES.Stable;
            const isSelected = activeModule === moduleType;

            return (
              <button
                key={key}
                onClick={() => onSelectModule?.(moduleType)}
                className={`p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between ${style.bg} ${
                  isSelected ? "ring-2 ring-primary border-primary scale-[1.02]" : "hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                </div>
                <div className={`text-xs font-bold ${style.text}`}>
                  ● {status}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 truncate" title={node?.detail}>
                  {node?.signal_count || 0} signals
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
