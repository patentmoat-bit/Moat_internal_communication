"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GaugeWidgetDef } from "@/lib/dashboardEngine";

interface GaugeWidgetProps {
  widget: GaugeWidgetDef;
}

export function GaugeWidget({ widget }: GaugeWidgetProps) {
  const { title, value, label, description, thresholds } = widget;

  // Threshold colors: good (green), warn (amber), bad (rose)
  const goodThreshold = thresholds?.good ?? 70;
  const warnThreshold = thresholds?.warn ?? 40;

  const getGaugeColor = (val: number) => {
    if (val >= goodThreshold) return "#10b981"; // emerald
    if (val >= warnThreshold) return "#f59e0b"; // amber
    return "#ef4444"; // rose
  };

  const getGaugeBgColorClass = (val: number) => {
    if (val >= goodThreshold) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (val >= warnThreshold) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  };

  const gaugeColor = getGaugeColor(value);

  // SVG parameters for half-circle (semi-circle) gauge
  const radius = 50;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; // 157.08
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-5 pt-2">
        <div className="relative w-40 h-24 flex items-end justify-center overflow-hidden">
          <svg className="w-full h-full transform translate-y-2" viewBox="0 0 120 70">
            {/* Background Track */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <motion.path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>

          {/* Label text inside the gauge */}
          <div className="absolute bottom-1 flex flex-col items-center">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {label || `${value}%`}
            </span>
          </div>
        </div>

        {description && (
          <p className="mt-3 text-xs text-center text-muted-foreground/70 leading-relaxed max-w-[200px]">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
