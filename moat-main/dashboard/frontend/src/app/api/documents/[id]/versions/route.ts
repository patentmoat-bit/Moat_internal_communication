import { DocumentsController } from "@/modules/documents/controller";

export async function POST(req: any, context: any) {
  return DocumentsController.addVersion(req, context);
}
