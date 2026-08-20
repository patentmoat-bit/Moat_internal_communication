import { NextRequest } from "next/server";
import { AlertsController } from "@/modules/alerts/controller";

export async function GET(req: NextRequest) {
  return AlertsController.list(req);
}

export async function POST(req: NextRequest) {
  return AlertsController.create(req);
}
