// ─── MOAT Dashboard Engine ────────────────────────────────────────────────────
// Central type registry and layout configuration for the widget engine.

export type WidgetType = "kpi" | "chart" | "gauge" | "table" | "trend";
export type ChartType = "line" | "area" | "bar" | "radar" | "pie";

// ── Widget Definitions ─────────────────────────────────────────────────────────

export interface KPIWidgetDef {
  id: string;
  type: "kpi";
  title: string;
  value: string | number;
  trend: string;
  trendDirection: "up" | "down" | "flat";
  description: string;
  href?: string;
  icon?: string;
  accentColor?: "gold" | "emerald" | "rose" | "blue" | "violet";
  sparkline?: number[];
}

export interface ChartWidgetDef {
  id: string;
  type: "chart";
  chartType: ChartType;
  title: string;
  subtitle?: string;
  data: Record<string, any>[];
  colSpan?: 1 | 2;
}

export interface GaugeWidgetDef {
  id: string;
  type: "gauge";
  title: string;
  value: number; // 0–100
  label: string;
  description?: string;
  thresholds?: { good: number; warn: number }; // defaults: good≥70, warn≥40
}

export interface TrendWidgetDef {
  id: string;
  type: "trend";
  title: string;
  value: string | number;
  delta: string;
  deltaDirection: "up" | "down" | "flat";
  sparkline: number[];
  unit?: string;
}

export interface TableWidgetDef {
  id: string;
  type: "table";
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; type?: "text" | "bar" | "badge" | "number" }[];
  rows: Record<string, any>[];
  colSpan?: 1 | 2;
}

export type AnyWidget =
  | KPIWidgetDef
  | ChartWidgetDef
  | GaugeWidgetDef
  | TrendWidgetDef
  | TableWidgetDef;

// ── Insight Panel ──────────────────────────────────────────────────────────────

export type InsightSeverity = "critical" | "high" | "medium" | "low" | "info";
export type InsightCategory = "alert" | "opportunity" | "action";

export interface InsightDef {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  cta?: string;
  ctaHref?: string;
  metric?: string;
}

// ── Dashboard Layout ───────────────────────────────────────────────────────────

export interface DashboardConfig {
  role: string;
  title: string;
  subtitle: string;
  badge: string;
  kpis: KPIWidgetDef[];
  trends: TrendWidgetDef[];
  charts: ChartWidgetDef[];
  gauges: GaugeWidgetDef[];
  tables: TableWidgetDef[];
  insights: InsightDef[];
  quickActions: { label: string; href: string; icon?: string }[];
}

// ── Accent colour map ──────────────────────────────────────────────────────────

export const ACCENT_CLASSES: Record<NonNullable<KPIWidgetDef["accentColor"]>, string> = {
  gold:    "text-[#c9a84c] border-[#c9a84c]/30 bg-[#c9a84c]/5",
  emerald: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5",
  rose:    "text-rose-600 border-rose-500/30 bg-rose-500/5",
  blue:    "text-blue-600 border-blue-500/30 bg-blue-500/5",
  violet:  "text-violet-600 border-violet-500/30 bg-violet-500/5",
};

export const ACCENT_BG: Record<NonNullable<KPIWidgetDef["accentColor"]>, string> = {
  gold:    "bg-[#c9a84c]",
  emerald: "bg-emerald-500",
  rose:    "bg-rose-500",
  blue:    "bg-blue-500",
  violet:  "bg-violet-500",
};
