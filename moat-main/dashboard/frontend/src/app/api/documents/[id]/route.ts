import { DocumentsController } from "@/modules/documents/controller";

export async function GET(req: any, context: any) {
  return DocumentsController.getById(req, context);
}
