"use client";

import { KPICard } from "./KPICard";
import { DynamicChart } from "./DynamicChart";
import { GaugeWidget } from "./GaugeWidget";
import { TableWidget } from "./TableWidget";
import { TrendWidget } from "./TrendWidget";
import type { AnyWidget } from "@/lib/dashboardEngine";

interface WidgetEngineProps {
  widget: AnyWidget;
}

export function WidgetEngine({ widget }: WidgetEngineProps) {
  switch (widget.type) {
    case "kpi":
      return <KPICard widget={widget} />;
    case "trend":
      return <TrendWidget widget={widget} />;
    case "gauge":
      return <GaugeWidget widget={widget} />;
    case "table":
      return <TableWidget widget={widget} />;
    case "chart":
      return (
        <DynamicChart
          id={widget.id}
          type={widget.chartType as any}
          title={widget.title}
          data={widget.data}
        />
      );
    default:
      return (
        <div className="p-4 border border-dashed rounded-xl bg-muted/20 text-xs text-muted-foreground">
          Unsupported widget type: {(widget as any).type}
        </div>
      );
  }
}
