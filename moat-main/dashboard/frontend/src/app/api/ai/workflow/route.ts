import { NextResponse } from "next/server";
import { agentWorkflowService } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const invention = typeof body?.invention === "string" ? body.invention.trim() : undefined;
    const claims = Array.isArray(body?.claims) ? body.claims.filter((claim: unknown): claim is string => typeof claim === "string") : undefined;
    const documents = Array.isArray(body?.documents) ? body.documents : undefined;

    if (!query && !invention) {
      return NextResponse.json({ error: "query or invention is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const result = await agentWorkflowService.run({
      userId: user?.id,
      query: query || invention || "",
      invention,
      claims,
      documents,
      includeImages: Boolean(body?.includeImages),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/workflow]", err);
    return NextResponse.json({ error: (err as Error).message || "Workflow failed" }, { status: 500 });
  }
}
