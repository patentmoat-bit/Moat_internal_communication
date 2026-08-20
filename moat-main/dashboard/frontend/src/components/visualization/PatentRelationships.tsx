"use client";

import Link from "next/link";
import { usePatentRelationships } from "@/hooks/useVisualization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Share2 } from "lucide-react";

interface PatentRelationshipsProps {
  patentId: string;
}

export function PatentRelationships({ patentId }: PatentRelationshipsProps) {
  const { data, isLoading } = usePatentRelationships(patentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Share2 className="h-4 w-4" /> Relationships</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.relationships.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Share2 className="h-4 w-4" /> Relationships</CardTitle></CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">No relationships found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Share2 className="h-4 w-4 text-primary" />
          Patent Relationships ({data.relationships.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.relationships.slice(0, 10).map((rel, i) => (
          <Link
            key={i}
            href={rel.target_id ? `/dashboard/patents/${rel.target_id}` : "#"}
            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{rel.target_title || rel.target_number}</p>
              <p className="text-xs text-muted-foreground">{rel.target_number}</p>
            </div>
            <div className="ml-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{rel.relationship}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
