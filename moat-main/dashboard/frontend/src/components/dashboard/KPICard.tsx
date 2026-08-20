"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp, Minus, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ACCENT_CLASSES, type KPIWidgetDef } from "@/lib/dashboardEngine";
import { cn } from "@/lib/utils";

interface KPICardProps {
  widget: KPIWidgetDef;
}

export function KPICard({ widget }: KPICardProps) {
  const { title, value, trend, trendDirection, description, href, accentColor = "gold", sparkline } = widget;

  const isUp = trendDirection === "up";
  const isDown = trendDirection === "down";

  const trendColor = isUp
    ? "text-emerald-500 bg-emerald-500/10"
    : isDown
    ? "text-rose-500 bg-rose-500/10"
    : "text-slate-400 bg-slate-400/10";

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  // Generate a smooth SVG path for the sparkline
  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;
    const width = 100;
    const height = 30;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;

    const points = sparkline.map((val, index) => {
      const x = (index / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return { x, y };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cpX1 = current.x + (next.x - current.x) / 2;
      const cpY1 = current.y;
      const cpX2 = current.x + (next.x - current.x) / 2;
      const cpY2 = next.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const strokeColor =
      accentColor === "gold"
        ? "#c9a84c"
        : accentColor === "emerald"
        ? "#10b981"
        : accentColor === "rose"
        ? "#f43f5e"
        : accentColor === "blue"
        ? "#3b82f6"
        : "#8b5cf6";

    return (
      <svg className="w-24 h-8 shrink-0 overflow-visible" viewBox="0 0 100 30">
        <defs>
          <linearGradient id={`sparkGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L 100 30 L 0 30 Z`}
          fill={`url(#sparkGrad-${widget.id})`}
        />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const accentClass = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.gold;

  const cardContent = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          {title}
        </p>
        <div className="flex items-center gap-1">
          {href && (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-[#c9a84c] transition-colors" />
          )}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-3xl font-black tracking-tight text-foreground transition-all duration-200 group-hover:text-[#c9a84c]">
            {value}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {trend && (
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {trend}
              </span>
            )}
            {description && (
              <span className="text-[10px] text-muted-foreground/60 font-medium">
                {description}
              </span>
            )}
          </div>
        </div>
        {renderSparkline()}
      </div>
    </CardContent>
  );

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full"
    >
      <Card
        className={cn(
          "relative overflow-hidden border-border/60 bg-card/90 backdrop-blur-md transition-all duration-300",
          "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-current",
          accentClass,
          href && "cursor-pointer group hover:shadow-xl hover:shadow-black/20 hover:border-[#c9a84c]/30"
        )}
      >
        {href ? (
          <Link href={href} className="block">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
      </Card>
    </motion.div>
  );
}
