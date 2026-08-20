"use client";

import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#c9a84c", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e"];
const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  borderColor: "#334155",
  borderRadius: "8px",
  fontSize: "12px",
};

interface DynamicChartProps {
  id: string;
  type: "line" | "area" | "bar" | "radar";
  title: string;
  data: Record<string, any>[];
}

function dataKeys(data: Record<string, any>[]): string[] {
  if (!data?.length) return [];
  return Object.keys(data[0]).filter((k) => k !== "name" && k !== "subject" && k !== "fullMark");
}

export function DynamicChart({ type, title, data }: DynamicChartProps) {
  const keys = dataKeys(data);

  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5} dot={{ r: 3, fill: COLORS[i % COLORS.length] }} activeDot={{ r: 5 }} />
            ))}
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {keys.map((k, i) => (
                <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                fill={`url(#grad-${k})`} />
            ))}
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
            ))}
          </BarChart>
        );

      case "radar":
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {keys.map((k, i) => (
              <Radar key={k} name={k} dataKey={k}
                stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.25}
                strokeWidth={2} />
            ))}
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </RadarChart>
        );

      default:
        return (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Unknown chart type
          </div>
        );
    }
  };

  return (
    <Card className="flex flex-col h-[300px] border-border/70 bg-card/80 backdrop-blur">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4 pr-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
