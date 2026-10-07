import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  
  const opportunity = {
    id: `opp-${Date.now()}`,
    source_news_id: id,
    title: body.title || "Derivative Strategic IP Opportunity",
    category: "WHITE_SPACE",
    rationale: body.rationale || "Derived from executive IP intelligence bulletin.",
    status: "IDENTIFIED",
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    opportunity,
    message: "Opportunity successfully created and linked to source news ID.",
  });
}
