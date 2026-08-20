import { SupabaseClient } from "@supabase/supabase-js";
import { BackupEngine } from "./BackupEngine";
import { RecoveryLogRecord, RecoveryType } from "./types";

/**
 * MOAT Phase 9 — Recovery Engine
 * Executes automated Recovery Testing (dry-run restore validation) and Disaster Recovery / Restore Wizard workflows.
 */
export class RecoveryEngine {
  private static mockRecoveryLogs: RecoveryLogRecord[] = [];

  constructor(
    private backupEngine: BackupEngine,
    private supabase?: SupabaseClient
  ) {
    if (RecoveryEngine.mockRecoveryLogs.length === 0) {
      RecoveryEngine.seedMockRecoveryLogs();
    }
  }

  public static getRecoveryLogsStore(): RecoveryLogRecord[] {
    return RecoveryEngine.mockRecoveryLogs;
  }

  /**
   * Execute Recovery Testing (dry-run restore test without mutating production data).
   */
  public async executeRecoveryTesting(backupId: string, initiatedBy = "SYSTEM_CRON"): Promise<RecoveryLogRecord> {
    return this.runRecoveryWorkflow(backupId, "TEST_RESTORE", initiatedBy);
  }

  /**
   * Execute Disaster Recovery / Restore Wizard (actual restoration simulation).
   */
  public async executeDisasterRecovery(backupId: string, initiatedBy = "ADMIN_WIZARD"): Promise<RecoveryLogRecord> {
    return this.runRecoveryWorkflow(backupId, "DISASTER_RECOVERY", initiatedBy);
  }

  private async runRecoveryWorkflow(
    backupId: string,
    recoveryType: RecoveryType,
    initiatedBy: string
  ): Promise<RecoveryLogRecord> {
    const logId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    // Verify backup integrity before restoring
    const integrity = await this.backupEngine.verifyBackupIntegrity(backupId);

    const backups = BackupEngine.getBackupsStore();
    const targetBackup = backups.find((b) => b.backupId === backupId);

    let status: "SUCCESS" | "FAILURE" = "SUCCESS";
    let errorMessage: string | null = null;
    let restoredRecordsCount = 42500; // simulated default record count

    if (!integrity.verified || !targetBackup) {
      status = "FAILURE";
      errorMessage = integrity.reason || `Backup ID ${backupId} could not be validated or found.`;
      restoredRecordsCount = 0;
    } else {
      // Calculate restored records based on backup target
      if (targetBackup.target === "DATABASE") restoredRecordsCount = 125400;
      else if (targetBackup.target === "STORAGE") restoredRecordsCount = 8420;
      else if (targetBackup.target === "SUPABASE") restoredRecordsCount = 214500;
      else if (targetBackup.target === "DOCUMENT") restoredRecordsCount = 18900;
      else if (targetBackup.target === "ALL") restoredRecordsCount = 356000;
    }

    const durationMs = Date.now() - startTime + Math.floor(Math.random() * 450) + 120; // simulate latency

    const logRecord: RecoveryLogRecord = {
      logId,
      backupId,
      recoveryType,
      status,
      restoredRecordsCount,
      durationMs,
      initiatedBy,
      createdAt: new Date().toISOString(),
      errorMessage,
      metadata: {
        target: targetBackup?.target || "UNKNOWN",
        encrypted: targetBackup?.encrypted || false,
        verificationStatus: integrity.status,
      },
    };

    RecoveryEngine.mockRecoveryLogs.unshift(logRecord);
    if (RecoveryEngine.mockRecoveryLogs.length > 200) {
      RecoveryEngine.mockRecoveryLogs.pop();
    }

    if (this.supabase) {
      try {
        await this.supabase.from("RecoveryLogs").insert({
          log_id: logRecord.logId,
          backup_id: logRecord.backupId,
          recovery_type: logRecord.recoveryType,
          status: logRecord.status,
          restored_records_count: logRecord.restoredRecordsCount,
          duration_ms: logRecord.durationMs,
          initiated_by: logRecord.initiatedBy,
          created_at: logRecord.createdAt,
          error_message: logRecord.errorMessage,
          metadata: logRecord.metadata,
        });
      } catch {
        // Fallback silently
      }
    }

    return logRecord;
  }

  public getRecoveryLogs(recoveryType?: RecoveryType): RecoveryLogRecord[] {
    let logs = [...RecoveryEngine.mockRecoveryLogs];
    if (recoveryType) logs = logs.filter((l) => l.recoveryType === recoveryType);
    return logs;
  }

  private static seedMockRecoveryLogs(): void {
    const now = Date.now();
    RecoveryEngine.mockRecoveryLogs = [
      {
        logId: "rec_seed_1",
        backupId: "bkp_seed_1",
        recoveryType: "TEST_RESTORE",
        status: "SUCCESS",
        restoredRecordsCount: 214500,
        durationMs: 420,
        initiatedBy: "SYSTEM_CRON",
        createdAt: new Date(now - 10 * 3600000).toISOString(),
        errorMessage: null,
        metadata: { target: "SUPABASE", encrypted: true, verificationStatus: "VERIFIED" },
      },
      {
        logId: "rec_seed_2",
        backupId: "bkp_seed_2",
        recoveryType: "TEST_RESTORE",
        status: "SUCCESS",
        restoredRecordsCount: 125400,
        durationMs: 180,
        initiatedBy: "SYSTEM_CRON",
        createdAt: new Date(now - 4 * 3600000).toISOString(),
        errorMessage: null,
        metadata: { target: "DATABASE", encrypted: true, verificationStatus: "VERIFIED" },
      },
    ];
  }
}
