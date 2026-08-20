-- ==============================================================================
-- MOAT ENTERPRISE PHASE 9: BACKUP & DISASTER RECOVERY
-- Relational Table Schema for Automated Backups, Integrity Checksums, and Recovery Logs
-- ==============================================================================

-- 1. BackupRecords Table
CREATE TABLE IF NOT EXISTS BackupRecords (
  backup_id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  target VARCHAR(64) NOT NULL, -- DATABASE, STORAGE, SUPABASE, DOCUMENT, ALL
  type VARCHAR(32) NOT NULL,   -- FULL, INCREMENTAL
  size_bytes BIGINT NOT NULL DEFAULT 0,
  encrypted BOOLEAN NOT NULL DEFAULT TRUE,
  encryption_algo VARCHAR(64) NOT NULL DEFAULT 'AES-256-GCM',
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- IN_PROGRESS, COMPLETED, FAILED, VERIFIED, CORRUPTED
  checksum VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_backup_target_status ON BackupRecords(target, status);
CREATE INDEX IF NOT EXISTS idx_backup_created ON BackupRecords(created_at DESC);

-- 2. RecoveryLogs Table
CREATE TABLE IF NOT EXISTS RecoveryLogs (
  log_id VARCHAR(128) PRIMARY KEY,
  backup_id VARCHAR(128) REFERENCES BackupRecords(backup_id) ON DELETE SET NULL,
  recovery_type VARCHAR(64) NOT NULL, -- TEST_RESTORE, DISASTER_RECOVERY
  status VARCHAR(32) NOT NULL,        -- SUCCESS, FAILURE, IN_PROGRESS
  restored_records_count INT NOT NULL DEFAULT 0,
  duration_ms INT NOT NULL DEFAULT 0,
  initiated_by VARCHAR(128) NOT NULL DEFAULT 'SYSTEM_CRON',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_recovery_type_status ON RecoveryLogs(recovery_type, status);
CREATE INDEX IF NOT EXISTS idx_recovery_created ON RecoveryLogs(created_at DESC);
