-- ==============================================================================
-- MOAT Patent Intelligence Platform: Enterprise File Upload Security Schema
-- ==============================================================================
-- Compliant with OWASP File Upload Security Guidelines, OWASP ASVS, and
-- Zero-Trust Enterprise Standards (Microsoft 365, Google Drive, AWS S3).
-- ==============================================================================

-- 1. Documents Table: Stores active document references and primary metadata
CREATE TABLE IF NOT EXISTS Documents (
    id VARCHAR(64) PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    storagePath VARCHAR(512) NOT NULL UNIQUE,
    originalName VARCHAR(255) NOT NULL,
    uploadedBy VARCHAR(64) NOT NULL,
    uploadedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    projectId VARCHAR(64) NOT NULL,
    sha256Hash CHAR(64) NOT NULL,
    fileSize INTEGER NOT NULL,
    mimeType VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'QUARANTINED', 'DELETED'))
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON Documents(projectId);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON Documents(sha256Hash);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON Documents(uploadedBy);

-- 2. DocumentVersions Table: Immutable version history artifacts
CREATE TABLE IF NOT EXISTS DocumentVersions (
    id VARCHAR(64) PRIMARY KEY,
    documentId VARCHAR(64) NOT NULL REFERENCES Documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    storagePath VARCHAR(512) NOT NULL,
    originalName VARCHAR(255) NOT NULL,
    uploadedBy VARCHAR(64) NOT NULL,
    uploadedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sha256Hash CHAR(64) NOT NULL,
    fileSize INTEGER NOT NULL,
    changeSummary TEXT,
    UNIQUE(documentId, version)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON DocumentVersions(documentId);

-- 3. DocumentPermissions Table: Role-Based Access Control & Project Membership
CREATE TABLE IF NOT EXISTS DocumentPermissions (
    id VARCHAR(64) PRIMARY KEY,
    documentId VARCHAR(64) NOT NULL REFERENCES Documents(id) ON DELETE CASCADE,
    projectId VARCHAR(64) NOT NULL,
    userId VARCHAR(64),
    role VARCHAR(64) NOT NULL,
    canRead BOOLEAN NOT NULL DEFAULT TRUE,
    canWrite BOOLEAN NOT NULL DEFAULT FALSE,
    canDelete BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_doc_perms_doc_id ON DocumentPermissions(documentId);
CREATE INDEX IF NOT EXISTS idx_doc_perms_user_role ON DocumentPermissions(userId, role);

-- 4. DocumentAuditLogs Table: Full lifecycle audit trail for all file operations
CREATE TABLE IF NOT EXISTS DocumentAuditLogs (
    id VARCHAR(64) PRIMARY KEY,
    documentId VARCHAR(64),
    projectId VARCHAR(64) NOT NULL,
    userId VARCHAR(64) NOT NULL,
    ipAddress VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_doc_id ON DocumentAuditLogs(documentId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON DocumentAuditLogs(projectId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON DocumentAuditLogs(userId);

-- 5. FileSecurityLogs Table: Security violation & malware telemetry for Admin investigation
CREATE TABLE IF NOT EXISTS FileSecurityLogs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    userId VARCHAR(64) NOT NULL,
    ipAddress VARCHAR(64) NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    fileHash CHAR(64),
    violationType VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))
);

CREATE INDEX IF NOT EXISTS idx_sec_logs_violation ON FileSecurityLogs(violationType);
CREATE INDEX IF NOT EXISTS idx_sec_logs_severity ON FileSecurityLogs(severity);
CREATE INDEX IF NOT EXISTS idx_sec_logs_timestamp ON FileSecurityLogs(timestamp);
