"use client";

import { motion } from "framer-motion";
import { Sparkles, Lightbulb, Tags } from "lucide-react";
import { usePatentSummary } from "@/hooks/useAI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AISummaryPanelProps {
  patentId: string;
}

export function AISummaryPanel({ patentId }: AISummaryPanelProps) {
  const { data, isLoading, isError } = usePatentSummary(patentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI summary unavailable. Configure an OpenAI API key to enable AI features.
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
            <Sparkles className="h-5 w-5 text-primary" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.summary}
          </p>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Key Innovations
            </h4>
            <ul className="space-y-1.5">
              {data.key_innovations.map((innovation, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {innovation}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              {data.technical_domain}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
