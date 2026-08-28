import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

const CONFIG_DOC_NAME = "SYSTEM_PERMISSIONS_MATRIX";
const FALLBACK_FILE_PATH = path.join(process.cwd(), "src/app/api/settings/permissions/permissions_config.json");

// Default state logic mapping for UI
const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  "Patent Dashboard": { "Read": true, "Write": true, "Delete": false, "Export": true, "Approve": true },
  "Trademarks": { "Read": true, "Write": false, "Delete": false, "Export": false, "Approve": false },
  "User Management": { "Read": false, "Write": false, "Delete": false, "Export": false, "Approve": false },
  "Settings": { "Read": false, "Write": false, "Delete": false, "Export": false, "Approve": false },
};

function readFallbackFile() {
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      const data = fs.readFileSync(FALLBACK_FILE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read fallback file", e);
  }
  return null;
}

function writeFallbackFile(data: any) {
  try {
    fs.mkdirSync(path.dirname(FALLBACK_FILE_PATH), { recursive: true });
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Failed to write fallback file", e);
    return false;
  }
}

// Neither method had an auth check — any authenticated user could read or
// overwrite the role/permission matrix. Admin-only now.
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("workspace_documents")
      .select("content")
      .eq("name", CONFIG_DOC_NAME)
      .single();

    if (error && error.message.includes("does not exist") || error?.message.includes("schema cache") || !data) {
      const localData = readFallbackFile();
      if (localData) {
        return NextResponse.json({ data: localData });
      }

      return NextResponse.json({ data: DEFAULT_MATRIX });
    }

    return NextResponse.json({ data: JSON.parse(data.content) });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const supabase = createAdminClient();

    const configData = body.matrix;
    if (!configData) {
      return NextResponse.json({ error: "Invalid matrix payload" }, { status: 400 });
    }

    const contentStr = JSON.stringify(configData);

    const { data: existing, error: readErr } = await supabase
      .from("workspace_documents")
      .select("id")
      .eq("name", CONFIG_DOC_NAME)
      .single();

    if (readErr && (readErr.message.includes("does not exist") || readErr.message.includes("schema cache"))) {
      const success = writeFallbackFile(configData);
      if (!success) {
        throw new Error("Failed to write to fallback file.");
      }
      return NextResponse.json({ success: true });
    }

    if (existing) {
      const { error } = await supabase
        .from("workspace_documents")
        .update({ content: contentStr, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
        
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("workspace_documents")
        .insert({
          name: CONFIG_DOC_NAME,
          description: "System-wide RBAC matrix configuration",
          content: contentStr,
          status: "published",
        });
        
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
