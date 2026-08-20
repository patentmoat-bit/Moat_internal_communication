"use client";

import { motion } from "framer-motion";
import { Cpu, TrendingUp, Layers } from "lucide-react";
import { usePatentFeatures } from "@/hooks/useAI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AIFeaturePanelProps {
  patentId: string;
}

const categoryColors: Record<string, string> = {
  Architecture: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Method: "bg-green-500/15 text-green-700 dark:text-green-400",
  Material: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Algorithm: "bg-[#c9a84c]/15 text-[#8a6a1e] dark:text-[#c9a84c]",
  Interface: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  System: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  Component: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  Process: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-amber-500" : "bg-muted-foreground/30";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

export function AIFeaturePanel({ patentId }: AIFeaturePanelProps) {
  const { data, isLoading, isError } = usePatentFeatures(patentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5 text-primary" />
            Feature Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            Feature Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Feature extraction unavailable. Configure OpenAI API key to enable.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5 text-primary" />
            Feature Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Innovation Level:
            </span>
            <Badge variant="secondary" className="text-xs">
              {data.innovation_level}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Domain:</span>
            <Badge variant="secondary" className="text-xs">
              {data.technology_domain}
            </Badge>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Extracted Features</h4>
            {data.features.map((feature, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{feature.feature}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${categoryColors[feature.category] ?? ""}`}
                  >
                    {feature.category}
                  </Badge>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {feature.description}
                </p>
                <RelevanceBar score={feature.relevance} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
