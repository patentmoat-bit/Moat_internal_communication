import { NextRequest } from "next/server";
import { PortfolioController } from "@/modules/portfolio/controller";

export async function GET(req: NextRequest) {
  return PortfolioController.list(req);
}

export async function POST(req: NextRequest) {
  return PortfolioController.create(req);
}
