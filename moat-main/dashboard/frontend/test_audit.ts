import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import WebSocket from "ws";

(global as any).WebSocket = WebSocket;
import { AuditLogService } from "./src/lib/security/auditLogService";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAuditLog() {
  const service = new AuditLogService(supabase);
  console.log("Attempting to log MFA_FAILED...");
  
  await service.logEvent({
    userId: "d35d2d0b-6c61-4cc6-bfce-922650b284e3", // we need a valid UUID, let's omit userId
    email: "test@moat.ai",
    eventType: "MFA_FAILED",
    ipAddress: "127.0.0.1",
    userAgent: "Test Agent",
    endpoint: "/api/auth/mfa/verify",
    status: "FAILURE",
    failureReason: "Invalid TOTP code",
  });
  
  console.log("Done. Checking DB...");
  const { data, error } = await supabase.from("audit_logs").select("*").limit(1).order("created_at", { ascending: false });
  console.log("Last audit log:", data, error);
}

testAuditLog();
