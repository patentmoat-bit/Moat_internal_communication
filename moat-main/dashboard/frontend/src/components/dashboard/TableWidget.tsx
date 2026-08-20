"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TableWidgetDef } from "@/lib/dashboardEngine";
import { cn } from "@/lib/utils";

interface TableWidgetProps {
  widget: TableWidgetDef;
}

export function TableWidget({ widget }: TableWidgetProps) {
  const { title, subtitle, columns, rows } = widget;

  const getBadgeColor = (val: string) => {
    const v = val.toLowerCase();
    if (v === "high" || v === "critical" || v === "yes") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    if (v === "medium" || v === "warning" || v === "partial" || v === "review") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (v === "low" || v === "info" || v === "active") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs text-muted-foreground/60">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground/70 font-semibold">
              {columns.map((col) => (
                <th key={col.key} className="pb-2.5 pt-1 font-medium first:pl-0 last:pr-0">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                {columns.map((col) => {
                  const val = row[col.key];
                  return (
                    <td key={col.key} className="py-3 first:pl-0 last:pr-0 text-foreground/90 font-medium">
                      {col.type === "bar" ? (
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <span className="w-8 shrink-0 text-right">{val}%</span>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#c9a84c] to-[#a3832d] rounded-full"
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ) : col.type === "badge" ? (
                        <Badge variant="outline" className={cn("font-bold text-[10px]", getBadgeColor(val))}>
                          {val}
                        </Badge>
                      ) : col.type === "number" ? (
                        <span className="font-mono">{val.toLocaleString()}</span>
                      ) : (
                        <span>{val}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
