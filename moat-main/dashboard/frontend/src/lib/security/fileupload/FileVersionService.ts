import crypto from "crypto";
import { DocumentRecord, DocumentVersionRecord } from "./types";

/**
 * FileVersionService
 * 
 * Enterprise file versioning engine for the MOAT Patent Intelligence Platform.
 * 1. Maintains immutable version history records (e.g., Patent_Draft_v1.pdf, Patent_Draft_v2.pdf).
 * 2. Automatically increments version numbers on duplicate filename uploads within a project.
 * 3. Guarantees that active executives (CEO, Patent Analyst) always query the latest version while retaining full historical artifacts for audit compliance.
 */
export class FileVersionService {
  // In-memory document and version repository for speed, testing, and dev resilience
  private static documentsMap: Map<string, DocumentRecord> = new Map();
  private static versionsMap: Map<string, DocumentVersionRecord[]> = new Map(); // Keyed by documentId

  /**
   * Register a new document upload or increment version if a document with the same originalName exists in the project.
   */
  static async registerDocument(
    projectId: string,
    originalName: string,
    storagePath: string,
    sha256Hash: string,
    fileSize: number,
    mimeType: string,
    uploadedBy: string,
    existingDocumentId?: string,
    changeSummary?: string
  ): Promise<{ document: DocumentRecord; versionRecord: DocumentVersionRecord; isNewVersion: boolean }> {
    const timestamp = new Date().toISOString();

    // Check if we are updating an existing document or if an active document with identical name exists in this project
    let targetDoc: DocumentRecord | undefined = undefined;
    if (existingDocumentId && this.documentsMap.has(existingDocumentId)) {
      targetDoc = this.documentsMap.get(existingDocumentId);
    } else {
      for (const doc of this.documentsMap.values()) {
        if (doc.projectId === projectId && doc.originalName.toLowerCase() === originalName.toLowerCase() && doc.status === "ACTIVE") {
          targetDoc = doc;
          break;
        }
      }
    }

    if (targetDoc) {
      // Increment version
      const newVersionNum = targetDoc.version + 1;
      const versionId = `ver_${crypto.randomUUID()}`;

      // Update active document metadata to point to latest version
      targetDoc.version = newVersionNum;
      targetDoc.storagePath = storagePath;
      targetDoc.sha256Hash = sha256Hash;
      targetDoc.fileSize = fileSize;
      targetDoc.uploadedAt = timestamp;
      targetDoc.uploadedBy = uploadedBy;
      this.documentsMap.set(targetDoc.id, targetDoc);

      // Create immutable version history record
      const versionRecord: DocumentVersionRecord = {
        id: versionId,
        documentId: targetDoc.id,
        version: newVersionNum,
        storagePath,
        originalName: this.formatVersionedName(originalName, newVersionNum),
        uploadedBy,
        uploadedAt: timestamp,
        sha256Hash,
        fileSize,
        changeSummary: changeSummary || `Version ${newVersionNum} uploaded.`
      };

      const docVersions = this.versionsMap.get(targetDoc.id) || [];
      docVersions.push(versionRecord);
      this.versionsMap.set(targetDoc.id, docVersions);

      return { document: targetDoc, versionRecord, isNewVersion: true };
    }

    // Create brand new document (Version 1)
    const newDocId = `doc_${crypto.randomUUID()}`;
    const versionId = `ver_${crypto.randomUUID()}`;

    const newDoc: DocumentRecord = {
      id: newDocId,
      version: 1,
      storagePath,
      originalName,
      uploadedBy,
      uploadedAt: timestamp,
      projectId,
      sha256Hash,
      fileSize,
      mimeType,
      status: "ACTIVE"
    };

    const versionRecord: DocumentVersionRecord = {
      id: versionId,
      documentId: newDocId,
      version: 1,
      storagePath,
      originalName: this.formatVersionedName(originalName, 1),
      uploadedBy,
      uploadedAt: timestamp,
      sha256Hash,
      fileSize,
      changeSummary: "Initial document upload (v1)."
    };

    this.documentsMap.set(newDocId, newDoc);
    this.versionsMap.set(newDocId, [versionRecord]);

    return { document: newDoc, versionRecord, isNewVersion: false };
  }

  /**
   * Format versioned file display name (e.g., Patent_Draft_v2.pdf).
   */
  static formatVersionedName(originalName: string, versionNumber: number): string {
    const extIndex = originalName.lastIndexOf(".");
    if (extIndex === -1) {
      return `${originalName}_v${versionNumber}`;
    }
    const base = originalName.substring(0, extIndex);
    const ext = originalName.substring(extIndex);
    // Strip any existing _v\d+ suffix from base
    const cleanBase = base.replace(/_v\d+$/i, "");
    return `${cleanBase}_v${versionNumber}${ext}`;
  }

  /**
   * Retrieve active document by ID (returns latest version).
   */
  static getDocument(documentId: string): DocumentRecord | undefined {
    return this.documentsMap.get(documentId);
  }

  /**
   * Retrieve all documents in a project.
   */
  static getProjectDocuments(projectId: string): DocumentRecord[] {
    const results: DocumentRecord[] = [];
    for (const doc of this.documentsMap.values()) {
      if (doc.projectId === projectId && doc.status === "ACTIVE") {
        results.push(doc);
      }
    }
    return results;
  }

  /**
   * Retrieve full version history for a document.
   */
  static getVersionHistory(documentId: string): DocumentVersionRecord[] {
    return this.versionsMap.get(documentId) || [];
  }

  /**
   * Retrieve specific version record of a document.
   */
  static getSpecificVersion(documentId: string, versionNumber: number): DocumentVersionRecord | undefined {
    const versions = this.versionsMap.get(documentId) || [];
    return versions.find((v) => v.version === versionNumber);
  }

  /**
   * Get all registered active documents (for duplicate SHA-256 detection across project).
   */
  static getAllDocuments(): DocumentRecord[] {
    return Array.from(this.documentsMap.values());
  }

  /**
   * Clear repository (for testing).
   */
  static clearRepository(): void {
    this.documentsMap.clear();
    this.versionsMap.clear();
  }
}
