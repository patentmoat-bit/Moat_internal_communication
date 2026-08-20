import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { GlobalExceptionHandler } from "@/lib/errors";

const CONFIG_DOC_NAME = "SYSTEM_EMAIL_CONFIG";
const FALLBACK_FILE_PATH = path.join(process.cwd(), "src/app/api/settings/email/email_config.json");

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

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("workspace_documents")
      .select("content")
      .eq("name", CONFIG_DOC_NAME)
      .single();

    // If table doesn't exist or doc not found, try fallback file
    if (error && error.message.includes("does not exist") || error?.message.includes("schema cache") || !data) {
      const localData = readFallbackFile();
      if (localData) {
        return NextResponse.json({ data: localData });
      }

      // Return default config if completely missing
      return NextResponse.json({
        data: {
          provider: "Microsoft Graph (Office 365)",
          tenantId: "",
          clientId: "",
          clientSecret: "",
          fromName: "MOAT Alerts",
          fromEmail: "noreply@moatplatform.io",
        }
      });
    }

    return NextResponse.json({ data: JSON.parse(data.content) });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    const configData = {
      provider: body.provider,
      tenantId: body.tenantId,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
    };
    const contentStr = JSON.stringify(configData);

    // Try reading to see if table exists
    const { data: existing, error: readErr } = await supabase
      .from("workspace_documents")
      .select("id")
      .eq("name", CONFIG_DOC_NAME)
      .single();

    // If table doesn't exist, use fallback file
    if (readErr && (readErr.message.includes("does not exist") || readErr.message.includes("schema cache"))) {
      const success = writeFallbackFile(configData);
      if (!success) {
        throw new Error("Failed to write to fallback file because database table is missing.");
      }
      return NextResponse.json({ success: true, message: "Saved to local file (database table missing)." });
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
          description: "System-wide email configuration settings",
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
