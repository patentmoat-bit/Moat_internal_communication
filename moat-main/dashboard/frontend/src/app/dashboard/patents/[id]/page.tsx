"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { usePatent } from "@/hooks/useSearch";
import { PatentViewer } from "@/components/patents/PatentViewer";
import { Button } from "@/components/ui/button";
import type { Patent, PatentDetail, LegalEvent, PatentFamilyMember, PatentImage } from "@/types";
import { getGooglePatentDetails } from "@/lib/googlePatents";

function mapPatentToDetail(patent: Patent): PatentDetail {
  const meta = patent.metadata || {};
  return {
    id: patent.id,
    patentNumber: patent.patent_number,
    title: patent.title,
    abstract: patent.abstract,
    assignee: patent.assignee,
    inventors: patent.inventors,
    filingDate: patent.filing_date,
    publicationDate: patent.publication_date,
    priorityDate: (meta as any).priority_date || undefined,
    status: patent.status,
    cpcClassifications: patent.cpc_classifications,
    ipcClassifications: patent.ipc_classifications,
    claims: patent.claims,
    citedPatents: patent.citations.map((c) => ({ number: c, title: c })),
    citedBy: ((meta as any).cited_by as string[] | undefined)?.map((c: string) => ({ number: c, title: c })),
    description: (meta as any).description as string | undefined,
    legalEvents: (meta as any).legal_events as LegalEvent[] | undefined,
    patentFamily: (meta as any).patent_family as PatentFamilyMember[] | undefined,
    images: (meta as any).images as PatentImage[] | undefined,
  };
}

export default function PatentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: patent, isLoading, isError, error } = usePatent(id);
  const [enriched, setEnriched] = useState<PatentDetail | null>(null);
  const [enriching, setEnriching] = useState(false);

  const detail = enriched || (patent ? mapPatentToDetail(patent) : null);

  useEffect(() => {
    const meta = patent?.metadata || {};
    const hasDescription = !!(meta as any).description;
    const hasImages = !!((meta as any).images as any[])?.length;
    if (patent && !hasDescription && !hasImages && !enriched) {
      setEnriching(true);
      getGooglePatentDetails(patent.patent_number)
        .then((res) => {
          if (res) {
            setEnriched({
              ...mapPatentToDetail(patent),
              description: res.description || undefined,
              images: res.images || undefined,
            });
          }
        })
        .catch(() => {})
        .finally(() => setEnriching(false));
    }
  }, [patent]);

  if (isLoading) {
    return <PatentViewer loading />;
  }

  if (isError || !patent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Patent not found</h2>
        <p className="mt-1 text-muted-foreground">
          {error instanceof Error ? error.message : "This patent could not be loaded."}
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/dashboard/search")}
        >
          Back to search
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {enriching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Enriching from Google Patents...
          </div>
        )}
      </div>
      <PatentViewer patent={detail} />
    </div>
  );
}