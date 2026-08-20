"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileSearch, ArrowRight, AlertCircle } from "lucide-react";
import { usePriorArt } from "@/hooks/useAI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AIPriorArtPanelProps {
  patentId: string;
}

export function AIPriorArtPanel({ patentId }: AIPriorArtPanelProps) {
  const { data, isLoading, isError } = usePriorArt(patentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSearch className="h-5 w-5 text-primary" />
            Prior Art Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
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
            <FileSearch className="h-5 w-5 text-muted-foreground" />
            Prior Art Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Prior art analysis unavailable. Configure OpenAI API key and Weaviate to enable.
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
            <FileSearch className="h-5 w-5 text-muted-foreground" />
            Prior Art Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No prior art found.</p>
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
            <FileSearch className="h-5 w-5 text-primary" />
            Prior Art Analysis
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {data.total_found} prior art references found
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.results.slice(0, 5).map((result) => (
            <Link
              key={result.patent_id}
              href={`/dashboard/patents/${result.patent_id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{result.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(result.similarity_score * 100)}% relevant
                </Badge>
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                {result.patent_number} &middot; {result.filing_date}
              </p>
              {result.relevance_reason && (
                <p className="text-xs text-muted-foreground">
                  {result.relevance_reason}
                </p>
              )}
              {result.key_overlaps.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {result.key_overlaps.map((overlap, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {overlap}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
