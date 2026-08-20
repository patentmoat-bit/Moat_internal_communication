/**
 * MOAT Enterprise Secrets Management & Key Rotation Types
 * 
 * Defines secret type categories, versioned secret records, cryptographic payloads,
 * access history schemas, and audit event logs.
 */

export type SecretType =
  | "JWT_SECRET"
  | "GRAPH_SECRET"
  | "SUPABASE_KEY"
  | "AES_ENCRYPTION_KEY"
  | "DATABASE_URL"
  | "API_KEY"
  | "OAUTH_SECRET";

export type SecretStatus = "ACTIVE" | "DEPRECATED" | "EXPIRED" | "REVOKED";

export interface EncryptedPayload {
  encryptedValue: string; // Hex encoded ciphertext
  iv: string;             // Hex encoded initialization vector (12 bytes for AES-GCM)
  authTag: string;        // Hex encoded authentication tag (16 bytes for AES-GCM)
}

export interface SecretVersionRecord {
  id: string;
  name: string;
  type: SecretType;
  version: number;
  payload: EncryptedPayload;
  status: SecretStatus;
  createdAt: string;
  expiresAt: string;
  lastAccessedAt?: string;
}

export type SecretAccessAction = "LOAD" | "DECRYPT" | "ROTATE" | "REVOKE" | "VALIDATE" | "RE_ENCRYPT";

export interface SecretAccessRecord {
  id: string;
  secretName: string;
  version: number;
  accessedBy: string; // User ID or Service name
  ipAddress: string;
  timestamp: string;
  action: SecretAccessAction;
}

export interface SecretAuditRecord {
  id: string;
  timestamp: string;
  eventType: string;
  secretName: string;
  version: number;
  details: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface RotationSummary {
  secretName: string;
  oldVersion: number;
  newVersion: number;
  rotatedAt: string;
  status: "SUCCESS" | "FAILED";
  reason?: string;
}
