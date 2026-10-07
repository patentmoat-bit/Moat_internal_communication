import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    message: "Article saved to CEO Watchlist",
    articleId: id,
    savedAt: new Date().toISOString(),
  });
}
