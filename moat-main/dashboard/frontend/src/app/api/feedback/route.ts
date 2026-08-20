import { NextRequest } from "next/server";
import { FeedbackController } from "@/modules/feedback/controller";

export async function GET(req: NextRequest) {
  return FeedbackController.list(req);
}

export async function POST(req: NextRequest) {
  return FeedbackController.submit(req);
}
