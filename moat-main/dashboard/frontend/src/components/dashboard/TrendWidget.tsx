"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TrendWidgetDef } from "@/lib/dashboardEngine";
import { cn } from "@/lib/utils";

interface TrendWidgetProps {
  widget: TrendWidgetDef;
}

export function TrendWidget({ widget }: TrendWidgetProps) {
  const { title, value, delta, deltaDirection, sparkline, unit } = widget;

  const isUp = deltaDirection === "up";
  const isDown = deltaDirection === "down";

  const trendColor = isUp
    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    : isDown
    ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
    : "text-slate-400 bg-slate-400/10 border-slate-400/20";

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  // Format data for Recharts area sparkline
  const chartData = sparkline.map((val, idx) => ({ name: idx.toString(), value: val }));

  const strokeColor = isUp ? "#10b981" : isDown ? "#f43f5e" : "#94a3b8";

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4 flex flex-col justify-between h-[130px]">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              {title}
            </p>
            <h3 className="text-2xl font-black mt-1 text-foreground">
              {value}
              {unit && <span className="text-xs font-semibold text-muted-foreground ml-1">{unit}</span>}
            </h3>
          </div>
          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {delta}
          </span>
        </div>

        {/* Mini Area Chart */}
        <div className="h-10 w-full mt-2 -mx-4 -mb-4 overflow-hidden shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`trendGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#trendGrad-${widget.id})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
