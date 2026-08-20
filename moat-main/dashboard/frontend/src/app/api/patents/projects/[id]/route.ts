import { NextRequest } from "next/server";
import { PatentsController } from "@/modules/patents/controller";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PatentsController.updateProject(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PatentsController.deleteProject(req, { params });
}
