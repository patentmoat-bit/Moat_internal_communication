import { NextRequest } from "next/server";
import { PatentsController } from "@/modules/patents/controller";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PatentsController.listDocuments(req, { params });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PatentsController.uploadDocument(req, { params });
}
