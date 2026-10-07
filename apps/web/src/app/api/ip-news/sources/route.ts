import { NextResponse } from "next/server";

export async function GET() {
  const sources = [
    "All",
    "USPTO",
    "WIPO",
    "EPO",
    "UK IPO",
    "IPWatchdog",
    "Patently-O",
  ];
  return NextResponse.json({ success: true, sources });
}
