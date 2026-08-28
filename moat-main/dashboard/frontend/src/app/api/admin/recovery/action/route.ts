import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DisasterRecoveryService } from "@/lib/security/recovery";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

// This had NO auth check at all — any authenticated user of any role could
// trigger a live restore_backup action that overwrites production data, plus
// arbitrary backup creation. Admin-only now, and "initiatedBy" is taken from
// the verified session instead of the client-supplied body (attribution
// spoofing on a destructive action's audit trail).
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { action, backupId, name, target, type } = body;
    const initiatedBy = admin.email || admin.id;

    const supabase = createAdminClient();
    const drService = new DisasterRecoveryService(supabase);

    if (action === "create_backup") {
      if (!name || !target || !type) {
        return NextResponse.json({ success: false, error: "Missing name, target, or type for backup creation." }, { status: 400 });
      }
      const record = await drService.triggerBackup(name, target, type);
      return NextResponse.json({ success: true, message: `Backup '${name}' successfully initiated and encrypted.`, record });
    }

    if (action === "verify_backup") {
      if (!backupId) {
        return NextResponse.json({ success: false, error: "Missing backupId for integrity verification." }, { status: 400 });
      }
      const verification = await drService.verifyBackup(backupId);
      return NextResponse.json({ success: true, message: `Integrity scan completed with status: ${verification.status}`, verification });
    }

    if (action === "test_recovery") {
      if (!backupId) {
        return NextResponse.json({ success: false, error: "Missing backupId for recovery testing." }, { status: 400 });
      }
      const log = await drService.runRecoveryTest(backupId, initiatedBy || "ADMIN_PANEL_TEST");
      return NextResponse.json({ success: true, message: "Dry-run test restore completed successfully.", log });
    }

    if (action === "restore_backup") {
      if (!backupId) {
        return NextResponse.json({ success: false, error: "Missing backupId for disaster recovery restore." }, { status: 400 });
      }
      const log = await drService.runDisasterRecoveryRestore(backupId, initiatedBy || "ADMIN_WIZARD");
      return NextResponse.json({ success: true, message: `Disaster Recovery restore executed! Restored ${log.restoredRecordsCount.toLocaleString()} records.`, log });
    }

    return NextResponse.json({ success: false, error: `Invalid action specified: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Disaster Recovery action API POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute disaster recovery action." },
      { status: 500 }
    );
  }
}
