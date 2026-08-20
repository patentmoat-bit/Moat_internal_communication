import { NextRequest } from "next/server";
import { AlertsController } from "@/modules/alerts/controller";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AlertsController.getOne(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AlertsController.update(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AlertsController.delete(req, { params });
}
