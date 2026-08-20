"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp, Minus, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPIWidgetProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down" | "flat";
  description?: string;
  href?: string;
}

export function KPIWidget({ title, value, trend, trendDirection, description, href }: KPIWidgetProps) {
  const trendColor =
    trendDirection === "up"
      ? "text-emerald-500"
      : trendDirection === "down"
      ? "text-rose-500"
      : "text-slate-400";

  const TrendIcon =
    trendDirection === "up" ? TrendingUp : trendDirection === "down" ? TrendingDown : Minus;

  const accentBorder =
    trendDirection === "up"
      ? "border-t-emerald-500/60"
      : trendDirection === "down"
      ? "border-t-rose-500/60"
      : "border-t-slate-500/40";

  return (
    <Card className={`border-border/60 border-t-2 ${accentBorder} bg-card/90 backdrop-blur overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${href ? "cursor-pointer group" : ""}`}>
      {href ? (
        <Link href={href} className="block">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</p>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-[#c9a84c] transition-colors" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground group-hover:text-[#c9a84c] transition-colors">{value}</p>
            {trend && (<div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${trendColor}`}><TrendIcon className="h-3.5 w-3.5" />{trend}</div>)}
            {description && (<p className="mt-2 text-xs text-muted-foreground/60 leading-relaxed">{description}</p>)}
          </CardContent>
        </Link>
      ) : (
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {trend && (<div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${trendColor}`}><TrendIcon className="h-3.5 w-3.5" />{trend}</div>)}
          {description && (<p className="mt-2 text-xs text-muted-foreground/60 leading-relaxed">{description}</p>)}
        </CardContent>
      )}
    </Card>
  );
}
