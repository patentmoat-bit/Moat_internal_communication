import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "./service";
import { FileDeleteSchema } from "./validation";

const service = new StorageService();

export class StorageController {
  static async upload(req: NextRequest) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const bucket = formData.get("bucket") as string || "documents";
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = `uploads/${uniqueName}`;

      const data = await service.upload(bucket, filePath, buffer, file.type);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async delete(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const bucket = searchParams.get("bucket");
      const path = searchParams.get("path");
      
      const parsed = FileDeleteSchema.safeParse({ bucket, path });
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      await service.delete(parsed.data.bucket, parsed.data.path);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
