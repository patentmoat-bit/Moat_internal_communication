"use client";

import { WidgetEngine } from "./WidgetEngine";
import type { AnyWidget } from "@/lib/dashboardEngine";

interface WidgetRendererProps {
  widget: AnyWidget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  return <WidgetEngine widget={widget} />;
}
