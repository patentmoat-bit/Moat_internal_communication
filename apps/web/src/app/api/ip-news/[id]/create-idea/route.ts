import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const idea = {
    id: `idea-${Date.now()}`,
    source_news_id: id,
    title: body.title || "Invention Idea inspired by IP Intelligence",
    problem: body.problem || "Emerging technology whitespace identified in external IP bulletin.",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    idea,
    message: "Invention idea initiated from intelligence bulletin.",
  });
}
