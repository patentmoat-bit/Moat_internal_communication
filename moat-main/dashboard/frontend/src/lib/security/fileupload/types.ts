/**
 * Enterprise File Upload Security Types & Interfaces
 * 
 * Defines all type contracts, approved/prohibited lists, magic byte signatures,
 * database entity schemas, and service response structures for the MOAT Platform.
 */

export type ApprovedFileExtension = 
  | "pdf" | "docx" | "doc" | "xlsx" | "pptx" 
  | "png" | "jpg" | "jpeg" | "svg" | "zip";

export type ProhibitedFileExtension = 
  | "exe" | "dll" | "bat" | "cmd" | "js" | "msi" 
  | "sh" | "php" | "asp" | "jsp" | "py" | "vbs" 
  | "scr" | "pif" | "com" | "jar" | "csh" | "ksh";

export const APPROVED_EXTENSIONS: Set<string> = new Set([
  "pdf", "docx", "doc", "xlsx", "pptx", 
  "png", "jpg", "jpeg", "svg", "zip"
]);

export const PROHIBITED_EXTENSIONS: Set<string> = new Set([
  "exe", "dll", "bat", "cmd", "js", "msi", 
  "sh", "php", "asp", "jsp", "py", "vbs", 
  "scr", "pif", "com", "jar", "csh", "ksh"
]);

export const APPROVED_MIME_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  doc: ["application/msword"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  svg: ["image/svg+xml"],
  zip: ["application/zip", "application/x-zip-compressed"]
};

// File Signature (Magic Bytes) definitions for binary header validation
export interface FileMagicSignature {
  extension: string;
  magicBytes: number[];
  offset?: number;
}

export const MAGIC_SIGNATURES: FileMagicSignature[] = [
  { extension: "pdf", magicBytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { extension: "png", magicBytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }, // \x89PNG\r\n\x1a\n
  { extension: "jpg", magicBytes: [0xFF, 0xD8, 0xFF] },
  { extension: "jpeg", magicBytes: [0xFF, 0xD8, 0xFF] },
  { extension: "zip", magicBytes: [0x50, 0x4B, 0x03, 0x04] }, // PK\x03\x04
  { extension: "docx", magicBytes: [0x50, 0x4B, 0x03, 0x04] }, // OOXML archives are ZIPs
  { extension: "xlsx", magicBytes: [0x50, 0x4B, 0x03, 0x04] },
  { extension: "pptx", magicBytes: [0x50, 0x4B, 0x03, 0x04] },
  { extension: "doc", magicBytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] } // OLE2 Compound Document
];

// Dangerous executable signatures to actively trap even if renamed
export const EXECUTABLE_SIGNATURES: Array<{ name: string; bytes: number[] }> = [
  { name: "Windows PE/EXE/DLL", bytes: [0x4D, 0x5A] }, // MZ
  { name: "Linux ELF Binary", bytes: [0x7F, 0x45, 0x4C, 0x46] }, // \x7FELF
  { name: "Mach-O Binary", bytes: [0xFE, 0xED, 0xFA, 0xCE] },
  { name: "Mach-O 64-bit", bytes: [0xFE, 0xED, 0xFA, 0xCF] },
  { name: "Shell Script (#!)", bytes: [0x23, 0x21] } // #!
];

export interface FileValidationOptions {
  maxSizeBytes?: number; // Default 10 MB (10,485,760 bytes)
  allowedExtensions?: Set<string>;
  allowDuplicates?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  sanitizedFileName: string;
  extension: string;
  mimeType: string;
  sha256Hash: string;
  sizeBytes: number;
  isDuplicate?: boolean;
  duplicateDocumentId?: string;
  errors: string[];
}

export interface VirusScanResult {
  isClean: boolean;
  scannerEngine: string;
  signatureDetected?: string;
  scanTimestamp: string;
  details?: string;
}

export interface DocumentRecord {
  id: string;
  version: number;
  storagePath: string;
  originalName: string;
  uploadedBy: string;
  uploadedAt: string;
  projectId: string;
  sha256Hash: string;
  fileSize: number;
  mimeType: string;
  status: "ACTIVE" | "ARCHIVED" | "QUARANTINED" | "DELETED";
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  version: number;
  storagePath: string;
  originalName: string;
  uploadedBy: string;
  uploadedAt: string;
  sha256Hash: string;
  fileSize: number;
  changeSummary?: string;
}

export type DocumentPermissionRole = "CEO" | "Patent Analyst" | "Design Team" | "Admin" | string;

export interface DocumentPermissionRecord {
  id: string;
  documentId: string;
  projectId: string;
  userId?: string;
  role: DocumentPermissionRole;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export type FileAuditEventType = 
  | "UPLOAD_SUCCESS"
  | "UPLOAD_REJECTED"
  | "DOWNLOAD_SUCCESS"
  | "DOWNLOAD_DENIED"
  | "DELETE_SUCCESS"
  | "VERSION_CREATED"
  | "VIRUS_DETECTED"
  | "PERMISSION_DENIED"
  | "DUPLICATE_DETECTED"
  | "VALIDATION_FAILED";

export interface DocumentAuditLogRecord {
  id: string;
  documentId?: string;
  projectId: string;
  userId: string;
  ipAddress: string;
  action: FileAuditEventType;
  fileName: string;
  timestamp: string;
  details?: string;
}

export interface FileSecurityLogRecord {
  id: string;
  timestamp: string;
  userId: string;
  ipAddress: string;
  fileName: string;
  fileHash?: string;
  violationType: "VIRUS_MALWARE" | "MAGIC_BYTE_SPOOFING" | "DOUBLE_EXTENSION_ATTACK" | "UNAUTHORIZED_EXTENSION" | "ZIP_BOMB" | "SIZE_LIMIT_EXCEEDED" | "PATH_TRAVERSAL";
  details: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresAt: string;
  documentId: string;
  version: number;
  fileName: string;
}

export interface UploadWorkflowContext {
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  userId: string;
  userRole: DocumentPermissionRole;
  projectId: string;
  clientIp: string;
  documentId?: string; // If uploading a new version to an existing document
  versionNotes?: string;
}

export interface UploadWorkflowResult {
  success: boolean;
  documentId?: string;
  version?: number;
  storagePath?: string;
  sha256Hash?: string;
  fileName?: string;
  isDuplicate?: boolean;
  message: string;
  errors?: string[];
}
