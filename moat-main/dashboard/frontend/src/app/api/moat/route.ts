import { NextRequest } from "next/server";
import { WorkspaceController } from "@/modules/workspace/controller";

export async function GET(req: NextRequest) {
  return WorkspaceController.listInventions(req);
}

export async function POST(req: NextRequest) {
  return WorkspaceController.createInvention(req);
}
