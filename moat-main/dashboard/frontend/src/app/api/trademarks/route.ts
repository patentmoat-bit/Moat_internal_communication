import { NextRequest } from "next/server";
import { TrademarksController } from "@/modules/trademarks/controller";

export async function GET(req: NextRequest) {
  return TrademarksController.list(req);
}

export async function POST(req: NextRequest) {
  return TrademarksController.create(req);
}
