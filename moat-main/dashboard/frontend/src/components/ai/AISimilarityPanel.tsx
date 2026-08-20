"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GitCompare, ArrowRight, AlertCircle } from "lucide-react";
import { usePatentSimilarity } from "@/hooks/useAI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AISimilarityPanelProps {
  patentId: string;
}

function SimilarityScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : pct >= 40
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-muted text-muted-foreground";
  return (
    <Badge className={color} variant="secondary">
      {pct}% match
    </Badge>
  );
}

export function AISimilarityPanel({ patentId }: AISimilarityPanelProps) {
  const { data, isLoading, isError } = usePatentSimilarity(patentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5 text-primary" />
            Similar Patents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
            <GitCompare className="h-5 w-5 text-muted-foreground" />
            Similar Patents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Similarity analysis unavailable.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (data.results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5 text-muted-foreground" />
            Similar Patents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No similar patents found.</p>
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
            <GitCompare className="h-5 w-5 text-primary" />
            Similar Patents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.results.slice(0, 5).map((result) => (
            <Link
              key={result.patent_id}
              href={`/dashboard/patents/${result.patent_id}`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{result.title}</p>
                <p className="text-xs text-muted-foreground">
                  {result.patent_number}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <SimilarityScoreBadge score={result.similarity_score} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
