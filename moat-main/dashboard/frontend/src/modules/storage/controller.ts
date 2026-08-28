import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "./service";
import { FileDeleteSchema } from "./validation";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

const service = new StorageService();

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

// Not currently wired to any route.ts, but neither method had an auth check —
// upload() also let the caller pick any bucket name via form data, the exact
// pattern that was a real, exploited vulnerability in /api/upload/route.ts
// this session. Fixed here too so this doesn't reproduce the same issue the
// moment someone wires it up.
const ALLOWED_BUCKET = "documents";

export class StorageController {
  static async upload(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const formData = await req.formData();
      const file = formData.get("file") as File;
      const bucket = (formData.get("bucket") as string) || ALLOWED_BUCKET;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (bucket !== ALLOWED_BUCKET) {
        return NextResponse.json({ error: "Invalid bucket." }, { status: 400 });
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
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { searchParams } = new URL(req.url);
      const bucket = searchParams.get("bucket");
      const path = searchParams.get("path");

      const parsed = FileDeleteSchema.safeParse({ bucket, path });
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }
      if (parsed.data.bucket !== ALLOWED_BUCKET) {
        return NextResponse.json({ error: "Invalid bucket." }, { status: 400 });
      }

      await service.delete(parsed.data.bucket, parsed.data.path);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
