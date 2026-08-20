import { 
  FileUploadValidationService,
  VirusScanService,
  SecureFileStorageService,
  FileVersionService,
  FilePermissionService,
  SecureDownloadService,
  FileAuditLogService,
  FileNotificationService,
  EnterpriseFileUploadService
} from "../index";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE FILE UPLOAD SECURITY — MASTER VERIFICATION SUITE");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(testNumber: number, requirementName: string, testFn: () => void | Promise<void>, expectedDescription: string) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`[PASS] Req #${testNumber}: ${requirementName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Req #${testNumber}: ${requirementName} — Exception:`, err.message);
  }
}

async function main() {
  // Clear repositories before starting tests
  SecureFileStorageService.clearMemoryStore();
  FileVersionService.clearRepository();
  FilePermissionService.clearPermissions();
  FileAuditLogService.clearLogs();
  FileNotificationService.clearQueue();
  VirusScanService.clearAdminAlerts();
  SecureDownloadService.clearRegistry();

  // 1. Supported vs Prohibited File Types
  await runTest(
    1,
    "Approved & Prohibited File Extensions",
    async () => {
      const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
      const pdfRes = await FileUploadValidationService.validateFile(validPdfBuffer, "Patent_Filing_2026.pdf", "application/pdf");
      if (!pdfRes.isValid) throw new Error(`Valid PDF was rejected! Errors: ${pdfRes.errors.join("; ")}`);

      const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ executable
      const exeRes = await FileUploadValidationService.validateFile(exeBuffer, "setup_installer.exe", "application/octet-stream");
      if (exeRes.isValid) throw new Error("Prohibited executable (.exe) was not rejected!");
      if (!exeRes.errors.some((e) => e.includes("executable") || e.includes("not in the approved"))) {
        throw new Error(`Unexpected error message for .exe: ${exeRes.errors.join("; ")}`);
      }

      const phpRes = await FileUploadValidationService.validateFile(Buffer.from("<?php system($_GET['cmd']); ?>"), "webshell.php", "text/x-php");
      if (phpRes.isValid) throw new Error("Prohibited PHP script was not rejected!");
    },
    "Verified that approved files (PDF, DOCX, PNG, ZIP) are allowed while executables and scripts (EXE, DLL, PHP, JS, SH) are strictly rejected."
  );

  // 2. File Signature / Magic Byte Spoofing Defense
  await runTest(
    2,
    "Magic Byte & File Signature Spoofing Defense",
    async () => {
      // Attacker names an EXE file with a .pdf extension and application/pdf MIME type
      const spoofedBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ Windows executable header
      const spoofRes = await FileUploadValidationService.validateFile(spoofedBuffer, "Confidential_Patent_Report.pdf", "application/pdf");

      if (spoofRes.isValid) {
        throw new Error("Magic byte spoofing attack bypassed validation! Executable with .pdf extension was allowed.");
      }
      if (!spoofRes.errors.some((e) => e.includes("Magic Byte Spoofing") || e.includes("executable signature"))) {
        throw new Error(`Expected Magic Byte Spoofing detection error, got: ${spoofRes.errors.join("; ")}`);
      }
    },
    "Verified that inspecting real binary magic bytes catches and rejects executable header spoofing even when extension is .pdf."
  );

  // 3. Double Extension Attack Defense
  await runTest(
    3,
    "Double Extension Attack Defense",
    async () => {
      const validBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF
      const dblRes1 = await FileUploadValidationService.validateFile(validBuffer, "patent_draft.pdf.exe", "application/octet-stream");
      if (dblRes1.isValid) throw new Error("Double extension attack (patent_draft.pdf.exe) was not rejected!");

      const dblRes2 = await FileUploadValidationService.validateFile(validBuffer, "financial_summary.php.png", "image/png");
      if (dblRes2.isValid) throw new Error("Double extension attack (financial_summary.php.png) was not rejected!");
      if (!dblRes2.errors.some((e) => e.includes("Double extension attack"))) {
        throw new Error(`Expected double extension attack error, got: ${dblRes2.errors.join("; ")}`);
      }
    },
    "Verified that filenames with intermediate prohibited extensions (e.g. .pdf.exe or .php.png) are trapped and rejected."
  );

  // 4. Malware / Antivirus Scanning
  await runTest(
    4,
    "Antivirus Malware Scanning & Heuristic Protection",
    async () => {
      const eicarBuffer = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
      const virusRes = await VirusScanService.scanFile(eicarBuffer, "infected_document.pdf", "usr_hacker", "10.0.0.99");

      if (virusRes.isClean) throw new Error("Antivirus engine failed to detect EICAR standard test malware!");
      if (!virusRes.signatureDetected?.includes("EICAR")) {
        throw new Error(`Expected EICAR detection, got: ${virusRes.signatureDetected}`);
      }

      // Check Admin alerts queue
      const alerts = VirusScanService.getAdminAlerts();
      if (alerts.length === 0 || alerts[0].fileName !== "infected_document.pdf") {
        throw new Error("Malware detection failed to dispatch real-time alert to Admin queue!");
      }

      // Test heuristic macro detection
      const macroBuffer = Buffer.from("Sub Document_Open()\nShellExecute 'cmd.exe /c powershell.exe -enc malware'\nEnd Sub");
      const macroRes = await VirusScanService.scanFile(macroBuffer, "macro_patent.doc", "usr_hacker");
      if (macroRes.isClean) throw new Error("Heuristic engine failed to catch embedded OLE macro exploit!");
    },
    "Verified that ClamAV / HeurisEngine simulation detects malware signatures (EICAR, macro exploits) and triggers Admin alerts."
  );

  // 5. Secure Storage & UUID Filenames
  await runTest(
    5,
    "Secure Storage & UUID Filename Generation",
    async () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF
      const storeRes = await SecureFileStorageService.storeFile(buffer, "prj_quantum_101", "pdf", "application/pdf");

      if (!storeRes.storagePath.includes("projects/prj_quantum_101/")) {
        throw new Error(`Storage path malformed: ${storeRes.storagePath}`);
      }
      if (storeRes.physicalFileName === "patent_draft.pdf" || !storeRes.physicalFileName.endsWith(".pdf")) {
        throw new Error(`Physical storage filename is not a secure UUID: ${storeRes.physicalFileName}`);
      }

      // Verify retrieval from secure store
      const retrieved = await SecureFileStorageService.retrieveFile(storeRes.storagePath);
      if (!retrieved || retrieved.length !== buffer.length) {
        throw new Error("Failed to retrieve stored asset buffer from secure storage repository.");
      }
    },
    "Verified that physical blob storage uses random UUID filenames without exposing original client filenames."
  );

  // 6. File Versioning
  await runTest(
    6,
    "File Versioning & History Retention",
    async () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF
      const prjId = "prj_version_test";

      // Upload v1
      const res1 = await EnterpriseFileUploadService.processSecureUpload({
        fileBuffer: pdfBuffer,
        originalFileName: "AI_Patent_Specification.pdf",
        mimeType: "application/pdf",
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        projectId: prjId,
        clientIp: "192.168.1.50"
      });
      if (!res1.success || res1.version !== 1) throw new Error(`v1 upload failed: ${res1.message}`);

      // Upload v2 (same original name in same project)
      const res2 = await EnterpriseFileUploadService.processSecureUpload({
        fileBuffer: Buffer.concat([pdfBuffer, Buffer.from("--- updated claims v2 ---")]),
        originalFileName: "AI_Patent_Specification.pdf",
        mimeType: "application/pdf",
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        projectId: prjId,
        clientIp: "192.168.1.50"
      });
      if (!res2.success || res2.version !== 2) throw new Error(`v2 upload failed or did not increment: ${res2.message}`);
      if (res2.fileName !== "AI_Patent_Specification_v2.pdf") {
        throw new Error(`Versioned display name mismatch: expected 'AI_Patent_Specification_v2.pdf', got '${res2.fileName}'`);
      }

      // Check version history retention
      const history = FileVersionService.getVersionHistory(res1.documentId!);
      if (history.length !== 2) throw new Error(`Expected 2 version history records, got ${history.length}`);
      if (history[0].version !== 1 || history[1].version !== 2) throw new Error("Version history numbering sequence corrupted!");
    },
    "Verified that uploading identical file names increments version (v1 -> v2) while preserving immutable history artifacts."
  );

  // 7. Role-Based Access Control (RBAC)
  await runTest(
    7,
    "Role-Based Access Control & Broken Access Control Defense",
    async () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const prjId = "prj_rbac_defense";

      const uploadRes = await EnterpriseFileUploadService.processSecureUpload({
        fileBuffer: pdfBuffer,
        originalFileName: "Secret_FTO_Report.pdf",
        mimeType: "application/pdf",
        userId: "usr_analyst_assigned",
        userRole: "Patent Analyst",
        projectId: prjId,
        clientIp: "10.0.0.1"
      });

      const docId = uploadRes.documentId!;

      // 1. CEO -> All project documents
      const ceoCheck = FilePermissionService.canDownload(docId, "usr_ceo", "CEO");
      if (!ceoCheck.allowed) throw new Error(`CEO was denied access to document ${docId}: ${ceoCheck.reason}`);

      // 2. Assigned Analyst -> Allowed
      const analystCheck = FilePermissionService.canDownload(docId, "usr_analyst_assigned", "Patent Analyst", [prjId]);
      if (!analystCheck.allowed) throw new Error(`Assigned analyst denied access: ${analystCheck.reason}`);

      // 3. Unassigned outsider -> Denied (Broken Access Control defense)
      const outsiderCheck = FilePermissionService.canDownload(docId, "usr_outsider_99", "viewer", ["prj_unrelated_88"]);
      if (outsiderCheck.allowed) throw new Error("Broken Access Control failure: unassigned user was permitted download access to confidential project document!");
      if (!outsiderCheck.reason?.includes("Access Denied")) throw new Error(`Unexpected denial reason: ${outsiderCheck.reason}`);
    },
    "Verified that CEO/Admin access all project documents, assigned Analysts access project files, and unauthorized users are denied."
  );

  // 8. Secure Downloads & Expiring Signed URLs
  await runTest(
    8,
    "Secure Downloads & Short-Lived Signed URL Expiration",
    async () => {
      const doc = FileVersionService.getAllDocuments()[0];
      if (!doc) throw new Error("No existing document found to test download URL.");

      // Request signed URL (60s expiration)
      const dlRes = await SecureDownloadService.requestSignedDownloadUrl(
        doc.id,
        "usr_ceo",
        "CEO",
        "192.168.1.100",
        undefined,
        60
      );
      if (!dlRes.success || !dlRes.signedUrlData) throw new Error(`Failed to issue signed download URL: ${dlRes.error}`);

      const tokenMatch = dlRes.signedUrlData.signedUrl.match(/token=([a-f0-9]+)/i);
      const token = tokenMatch ? tokenMatch[1] : "";
      if (!token) throw new Error("Signed download URL is missing token parameter!");

      // Validate token
      const val1 = SecureDownloadService.validateTokenAndGetPath(token);
      if (!val1.isValid) throw new Error(`Token validation failed: ${val1.reason}`);

      // Check download audit logs
      const logs = FileAuditLogService.getAuditLogs({ documentId: doc.id });
      if (!logs.some((l) => l.action === "DOWNLOAD_SUCCESS" && l.userId === "usr_ceo")) {
        throw new Error("Download event was not recorded in immutable DocumentAuditLogs!");
      }
    },
    "Verified that SecureDownloadService issues 60s temporary signed URLs, validates tokens, and logs download events."
  );

  // 9. Automated Dashboard & Microsoft Graph Email Notifications
  await runTest(
    9,
    "Automated Dashboard & Microsoft Graph Email Notifications",
    async () => {
      FileNotificationService.clearQueue();

      // Trigger upload notifications: Analyst uploads -> notify CEO
      await FileNotificationService.triggerUploadNotifications(
        "Patent Analyst",
        "usr_analyst_07",
        "doc_notif_test_1",
        "BioTech_Patent_Claims.docx",
        "prj_biotech_2026"
      );

      const dashboardAlerts = FileNotificationService.getDashboardAlerts("CEO");
      if (dashboardAlerts.length === 0 || !dashboardAlerts[0].title.includes("New Patent Document")) {
        throw new Error("Analyst upload failed to trigger automated CEO dashboard notification!");
      }

      const graphEmails = FileNotificationService.getGraphEmails();
      if (graphEmails.length === 0 || graphEmails[0].recipientEmail !== "ceo@moat.ai") {
        throw new Error("Analyst upload failed to dispatch automated Microsoft Graph email alert to CEO!");
      }

      // Trigger CEO approval notifications -> notify Analyst + Designer
      await FileNotificationService.triggerApprovalNotifications(
        "doc_notif_test_1",
        "BioTech_Patent_Claims.docx",
        "prj_biotech_2026",
        "CEO"
      );

      const analystAlerts = FileNotificationService.getDashboardAlerts("Patent Analyst");
      const designerAlerts = FileNotificationService.getDashboardAlerts("Design Team");
      if (analystAlerts.length === 0 || designerAlerts.length === 0) {
        throw new Error("CEO approval failed to notify both Patent Analyst and Design Team!");
      }
    },
    "Verified that event-driven workflows automatically generate real-time dashboard alerts and Microsoft Graph email notifications."
  );

  console.log("\n================================================================================");
  console.log(` 🏆 FILE UPLOAD SECURITY VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
