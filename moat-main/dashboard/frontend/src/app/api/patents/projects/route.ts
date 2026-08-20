import { NextRequest } from "next/server";
import { PatentsController } from "@/modules/patents/controller";

export async function GET(req: NextRequest) {
  return PatentsController.listProjects(req);
}

export async function POST(req: NextRequest) {
  return PatentsController.createProject(req);
}
