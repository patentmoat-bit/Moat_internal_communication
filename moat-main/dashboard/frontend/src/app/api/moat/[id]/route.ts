import { NextRequest } from "next/server";
import { WorkspaceController } from "@/modules/workspace/controller";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return WorkspaceController.getInvention(req, { params });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return WorkspaceController.updateInvention(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return WorkspaceController.deleteInvention(req, { params });
}
