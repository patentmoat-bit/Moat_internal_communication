import { NextRequest } from "next/server";
import { PortfolioController } from "@/modules/portfolio/controller";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PortfolioController.getOne(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PortfolioController.update(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PortfolioController.delete(req, { params });
}
