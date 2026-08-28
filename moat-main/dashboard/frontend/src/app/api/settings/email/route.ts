import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

const SECRET_MASK = "********_SECURED_IN_ENV_********";

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
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

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
        // Env vars (if set) are the effective source of truth over the
        // committed placeholder file — mirror the resolution used when
        // actually sending mail (see src/lib/events/handlers.ts).
        if (process.env.AZURE_TENANT_ID) localData.tenantId = process.env.AZURE_TENANT_ID;
        if (process.env.AZURE_CLIENT_ID) localData.clientId = process.env.AZURE_CLIENT_ID;
        // Mask the secret for the UI
        localData.clientSecret = SECRET_MASK;
        return NextResponse.json({ data: localData });
      }

      // Return default config if completely missing
      return NextResponse.json({
        data: {
          provider: "Microsoft Graph (Office 365)",
          tenantId: process.env.AZURE_TENANT_ID || "",
          clientId: process.env.AZURE_CLIENT_ID || "",
          clientSecret: "",
          fromName: "MOAT Alerts",
          fromEmail: "noreply@moatplatform.io",
        }
      });
    }

    // This previously returned the DB-stored config as-is, including the raw
    // clientSecret in plaintext — every other code path in this file masks
    // it, this one just forgot to.
    const parsed = JSON.parse(data.content);
    if (parsed.clientSecret) parsed.clientSecret = SECRET_MASK;
    return NextResponse.json({ data: parsed });
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

    // If the UI sends the mask back, keep it secure by not overwriting it in the DB/file
    // (Instead, rely on the backend falling back to process.env.MS_GRAPH_CLIENT_SECRET)
    const finalSecret = body.clientSecret === SECRET_MASK ? SECRET_MASK : body.clientSecret;

    const configData = {
      provider: body.provider,
      tenantId: body.tenantId,
      clientId: body.clientId,
      clientSecret: finalSecret,
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
