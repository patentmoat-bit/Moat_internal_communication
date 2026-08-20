import { NextRequest } from "next/server";
import { TrademarksController } from "@/modules/trademarks/controller";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TrademarksController.getOne(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TrademarksController.update(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TrademarksController.delete(req, { params });
}
