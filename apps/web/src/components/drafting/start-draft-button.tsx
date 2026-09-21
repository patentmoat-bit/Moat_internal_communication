"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { DraftDetail } from "@/lib/types";

export function StartDraftButton({ inventionId }: { inventionId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const draft = await api<DraftDetail>("/drafts", {
        method: "POST",
        json: { inventionId, jurisdiction: "US" },
      });
      router.push(`/drafts/${draft.id}`);
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.body.code === "already_drafting") {
        router.push(`/drafts/${cause.body.document_id}`);
        return;
      }
      setError(cause instanceof ApiRequestError ? cause.body.message : "Could not start a draft.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="primary" onClick={start} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <PenLine />}
        Start draft
      </Button>
      {error ? <p className="text-[11px] text-critical">{error}</p> : null}
    </div>
  );
}
