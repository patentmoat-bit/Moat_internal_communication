import crypto from "crypto";
import { SignedUrlResponse, DocumentPermissionRole } from "./types";
import { FileVersionService } from "./FileVersionService";
import { FilePermissionService } from "./FilePermissionService";
import { FileAuditLogService } from "./FileAuditLogService";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SecureDownloadService
 * 
 * Enterprise secure file download and access broker for the MOAT Patent Intelligence Platform.
 * Enforces strict zero-trust download security:
 * 1. Validates user authentication and project/role access permissions prior to issuing download tokens.
 * 2. Generates short-lived temporary signed URLs with automatic expiration (default 60 seconds).
 * 3. Logs every successful download and access denial attempt to immutable audit records.
 */
export class SecureDownloadService {
  private static readonly DEFAULT_EXPIRATION_SECONDS = 60; // 1 minute temporary URL
  private static readonly STORAGE_BUCKET = "moat_secure_documents";

  // In-memory active signed URL token registry for expiration verification
  private static activeTokenRegistry: Map<string, { documentId: string; version: number; expiresAt: number; storagePath: string }> = new Map();

  /**
   * Request a temporary signed download URL for a document.
   */
  static async requestSignedDownloadUrl(
    documentId: string,
    userId: string,
    userRole: DocumentPermissionRole,
    clientIp: string,
    versionNumber?: number,
    expirationSeconds: number = this.DEFAULT_EXPIRATION_SECONDS
  ): Promise<{ success: boolean; signedUrlData?: SignedUrlResponse; error?: string }> {
    // 1. Validate permissions
    const permCheck = FilePermissionService.canDownload(documentId, userId, userRole);
    if (!permCheck.allowed) {
      await FileAuditLogService.logEvent(
        "DOWNLOAD_DENIED",
        "unknown_prj",
        userId,
        clientIp,
        documentId,
        documentId,
        permCheck.reason || "Unauthorized download attempt."
      );
      return { success: false, error: permCheck.reason };
    }

    const doc = FileVersionService.getDocument(documentId);
    if (!doc) {
      return { success: false, error: "Document not found." };
    }

    // 2. Resolve version record (latest or specific version)
    let versionRec = undefined;
    if (versionNumber) {
      versionRec = FileVersionService.getSpecificVersion(documentId, versionNumber);
    } else {
      const allVers = FileVersionService.getVersionHistory(documentId);
      versionRec = allVers.length > 0 ? allVers[allVers.length - 1] : undefined;
    }

    const targetPath = versionRec ? versionRec.storagePath : doc.storagePath;
    const targetName = versionRec ? versionRec.originalName : doc.originalName;
    const targetVerNum = versionRec ? versionRec.version : doc.version;

    // 3. Generate Signed URL and Token
    const expiresAtMillis = Date.now() + expirationSeconds * 1000;
    const expiresAtIso = new Date(expiresAtMillis).toISOString();
    const token = crypto.randomBytes(32).toString("hex");

    this.activeTokenRegistry.set(token, {
      documentId: doc.id,
      version: targetVerNum,
      expiresAt: expiresAtMillis,
      storagePath: targetPath
    });

    let signedUrl = `/api/security/documents/download?token=${token}`;

    // Try to get real Supabase signed URL if connected
    try {
      const supabase = createAdminClient();
      if (supabase && supabase.storage) {
        const { data, error } = await supabase.storage.from(this.STORAGE_BUCKET).createSignedUrl(targetPath, expirationSeconds);
        if (data && data.signedUrl) {
          signedUrl = data.signedUrl;
        }
      }
    } catch (err) {
      // Keep secure token fallback URL
    }

    // 4. Log successful download authorization
    await FileAuditLogService.logEvent(
      "DOWNLOAD_SUCCESS",
      doc.projectId,
      userId,
      clientIp,
      targetName,
      doc.id,
      `Issued 60s signed download URL for version ${targetVerNum}.`
    );

    return {
      success: true,
      signedUrlData: {
        signedUrl,
        expiresAt: expiresAtIso,
        documentId: doc.id,
        version: targetVerNum,
        fileName: targetName
      }
    };
  }

  /**
   * Validate a download token and return storage path if valid and unexpired.
   */
  static validateTokenAndGetPath(token: string): { isValid: boolean; storagePath?: string; reason?: string } {
    const entry = this.activeTokenRegistry.get(token);
    if (!entry) {
      return { isValid: false, reason: "Invalid or nonexistent download token." };
    }

    if (Date.now() > entry.expiresAt) {
      this.activeTokenRegistry.delete(token);
      return { isValid: false, reason: "Download signed URL token has expired." };
    }

    return { isValid: true, storagePath: entry.storagePath };
  }

  /**
   * Clear active tokens (for testing).
   */
  static clearRegistry(): void {
    this.activeTokenRegistry.clear();
  }
}
