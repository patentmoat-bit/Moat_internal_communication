export type BackupType = "FULL" | "INCREMENTAL";
export type BackupTarget = "DATABASE" | "STORAGE" | "SUPABASE" | "DOCUMENT" | "ALL";
export type BackupStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VERIFIED" | "CORRUPTED";
export type RecoveryType = "TEST_RESTORE" | "DISASTER_RECOVERY";
export type RecoveryStatus = "SUCCESS" | "FAILURE" | "IN_PROGRESS";

export interface BackupRecord {
  backupId: string;
  name: string;
  target: BackupTarget;
  type: BackupType;
  sizeBytes: number;
  encrypted: boolean;
  encryptionAlgo: string;
  status: BackupStatus;
  checksum: string;
  createdAt: string;
  completedAt?: string | null;
  verifiedAt?: string | null;
  metadata?: Record<string, any>;
}

export interface RecoveryLogRecord {
  logId: string;
  backupId: string;
  recoveryType: RecoveryType;
  status: RecoveryStatus;
  restoredRecordsCount: number;
  durationMs: number;
  initiatedBy: string;
  createdAt: string;
  errorMessage?: string | null;
  metadata?: Record<string, any>;
}

export interface DisasterRecoveryMetrics {
  rpoHours: number; // Recovery Point Objective
  rtoMinutes: number; // Recovery Time Objective
  lastBackupAt: string | null;
  lastTestedAt: string | null;
  lastTestStatus: "SUCCESS" | "FAILURE" | "NEVER";
  totalBackupsCount: number;
  totalStorageBytes: number;
  automatedSchedule: string; // e.g. "Every 6 Hours (Incremental), Daily (Full)"
  encryptionStatus: "ENFORCED_AES_256_GCM" | "DISABLED";
}

export interface RecoveryDashboardSummary {
  metrics: DisasterRecoveryMetrics;
  recentBackups: BackupRecord[];
  recoveryLogs: RecoveryLogRecord[];
  activeTargets: {
    target: BackupTarget;
    lastBackup: string | null;
    status: "HEALTHY" | "DEGRADED" | "NO_BACKUP";
  }[];
}
