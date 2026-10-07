import { NextResponse } from "next/server";

export async function GET() {
  const categories = [
    "All",
    "Patents",
    "Trademarks",
    "Copyright",
    "Competitor IP",
    "Technology",
    "Regulatory",
    "Market",
  ];
  return NextResponse.json({ success: true, categories });
}
