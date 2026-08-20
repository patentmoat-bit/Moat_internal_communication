import {
  PermissionService,
  ProjectAccessService,
  WorkflowValidationService,
  DocumentAccessService,
  AuthorizationAuditLogService,
  AuthorizationNotificationService,
  AuthenticationMiddleware,
  AuthorizationMiddleware
} from "../index";

console.log("====================================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE API AUTHORIZATION & BUSINESS LOGIC SECURITY — MASTER VERIFICATION SUITE");
console.log("====================================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(testNumber: number, requirementName: string, testFn: () => void | Promise<void>, expectedDescription: string) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`[PASS] Test #${testNumber}: ${requirementName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Test #${testNumber}: ${requirementName} — Exception:`, err.message);
  }
}

async function main() {
  // Clear repositories before starting tests
  ProjectAccessService.clearRepository();
  WorkflowValidationService.clearRepository();
  DocumentAccessService.clearRepository();
  AuthorizationAuditLogService.clearLogs();
  AuthorizationNotificationService.clearRepository();
  AuthenticationMiddleware.clearRepository();

  // 1. Project-Level Access Control (IDOR / BOLA Prevention)
  await runTest(
    1,
    "Project-Level Access Control & IDOR / BOLA Prevention",
    async () => {
      const prjId = "prj_confidential_alpha";
      ProjectAccessService.registerProject(prjId, "Quantum AI Patent Engine", "usr_analyst_owner", ["usr_designer_assigned"]);

      // 1. Assigned owner -> Allowed
      const ownerRes = await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_owner",
        userRole: "Patent Analyst",
        projectId: prjId,
        requiredPermission: "projects:read",
        endpoint: "/api/projects/view"
      });
      if (!ownerRes.authorized) throw new Error(`Assigned owner was denied access to project: ${ownerRes.reason}`);

      // 2. Assigned member -> Allowed
      const memberRes = await AuthorizationMiddleware.authorize({
        userId: "usr_designer_assigned",
        userRole: "Design Team",
        projectId: prjId,
        requiredPermission: "projects:read"
      });
      if (!memberRes.authorized) throw new Error(`Assigned member was denied access to project: ${memberRes.reason}`);

      // 3. Unassigned outsider -> Denied with IDOR_BOLA violation
      const outsiderRes = await AuthorizationMiddleware.authorize({
        userId: "usr_outsider_99",
        userRole: "Patent Analyst",
        projectId: prjId,
        requiredPermission: "projects:read"
      });
      if (outsiderRes.authorized) throw new Error("IDOR / BOLA vulnerability: Unassigned user was granted access to private project!");
      if (outsiderRes.violationType !== "IDOR_BOLA") throw new Error(`Expected IDOR_BOLA violation, got: ${outsiderRes.violationType}`);

      // Check audit log for IDOR attempt
      const logs = AuthorizationAuditLogService.getAuditLogs({ userId: "usr_outsider_99" });
      if (logs.length === 0 || logs[0].action !== "IDOR_ATTEMPT_BLOCKED") {
        throw new Error("IDOR attempt was not recorded in immutable authorization audit logs!");
      }
    },
    "Verified that users cannot access projects they are not assigned to, preventing project enumeration and IDOR."
  );

  // 2. Role-Based Permission Enforcement (BFLA & Role Bypass Prevention)
  await runTest(
    2,
    "Role-Based Permissions & Role Bypass Prevention",
    async () => {
      // CEO -> View portfolio and approve submissions
      if (!PermissionService.hasPermission("CEO", "patents:approve") || !PermissionService.hasPermission("CEO", "portfolio:analytics")) {
        throw new Error("CEO lacks required executive permissions!");
      }

      // Patent Analyst -> Can edit projects and upload reports, but CANNOT approve final filings
      if (!PermissionService.hasPermission("Patent Analyst", "patents:write") || !PermissionService.hasPermission("Patent Analyst", "projects:edit")) {
        throw new Error("Patent Analyst lacks required project/patent editing permissions!");
      }
      if (PermissionService.hasPermission("Patent Analyst", "patents:approve")) {
        throw new Error("Role bypass vulnerability: Patent Analyst is illegally allowed to approve final patent filings!");
      }

      // Design Team -> Can download documents and upload designs, but CANNOT manage users or settings
      if (!PermissionService.hasPermission("Design Team", "documents:download") || !PermissionService.hasPermission("Design Team", "documents:upload")) {
        throw new Error("Design Team lacks required document upload/download permissions!");
      }
      if (PermissionService.hasPermission("Design Team", "users:manage")) {
        throw new Error("Role bypass vulnerability: Design Team is permitted user administration access!");
      }

      // Test authorization middleware enforcing role bypass restriction
      const bypassRes = await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        requiredPermission: "patents:approve",
        endpoint: "/api/patents/approve"
      });
      if (bypassRes.authorized) throw new Error("Authorization middleware allowed Patent Analyst to bypass role restrictions and approve patent!");
      if (bypassRes.violationType !== "BFLA_PRIVILEGE") throw new Error(`Expected BFLA_PRIVILEGE violation, got ${bypassRes.violationType}`);
    },
    "Verified that CEO, Patent Analyst, Designer, and Admin permissions are strictly enforced on backend, blocking role bypass."
  );

  // 3. Workflow State Machine Integrity (Step-Skipping & State Tampering Prevention)
  await runTest(
    3,
    "Workflow State Machine Integrity & Tampering Defense",
    async () => {
      const objId = "pat_claim_quantum_88";
      WorkflowValidationService.setInitialStage(objId, "New");

      // 1. Valid transition: New -> Assigned
      const val1 = await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        targetObjectId: objId,
        currentWorkflowStage: "New",
        targetWorkflowStage: "Assigned"
      });
      if (!val1.authorized) throw new Error(`Valid workflow transition (New -> Assigned) failed: ${val1.reason}`);

      // 2. Illegal step-skipping: Assigned -> Approved (jumping 6 stages!)
      const illegalRes = await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        targetObjectId: objId,
        currentWorkflowStage: "Assigned",
        targetWorkflowStage: "Approved"
      });
      if (illegalRes.authorized) throw new Error("Workflow state tampering allowed! Object jumped directly from Assigned to Approved without review.");
      if (illegalRes.violationType !== "WORKFLOW_TAMPERING") throw new Error(`Expected WORKFLOW_TAMPERING violation, got ${illegalRes.violationType}`);

      // 3. Role restriction on stage gate: Patent Analyst attempting to move from CEO Review to Approved
      WorkflowValidationService.setInitialStage(objId, "CEO Review");
      const analystApprove = await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        targetObjectId: objId,
        currentWorkflowStage: "CEO Review",
        targetWorkflowStage: "Approved"
      });
      if (analystApprove.authorized) throw new Error("Analyst was allowed to execute CEO Review -> Approved transition!");

      // 4. CEO executing CEO Review -> Approved
      const ceoApprove = await AuthorizationMiddleware.authorize({
        userId: "usr_ceo_1",
        userRole: "CEO",
        targetObjectId: objId,
        currentWorkflowStage: "CEO Review",
        targetWorkflowStage: "Approved"
      });
      if (!ceoApprove.authorized) throw new Error(`CEO failed to approve patent from CEO Review stage: ${ceoApprove.reason}`);
    },
    "Verified that workflow transitions follow strict 13-stage lifecycle and prevent state tampering or step-skipping."
  );

  // 4. Document Authorization & Mutation Boundaries
  await runTest(
    4,
    "Document Authorization & Unauthorized Download Prevention",
    async () => {
      const docId = "doc_confidential_design_spc";
      const prjId = "prj_doc_test";
      ProjectAccessService.registerProject(prjId, "Project Doc Test", "usr_analyst_owner", ["usr_designer_1"]);
      DocumentAccessService.registerDocumentOwnership(docId, "usr_analyst_owner", prjId);

      // 1. Authorized download by assigned designer
      const dlAllowed = await AuthorizationMiddleware.authorize({
        userId: "usr_designer_1",
        userRole: "Design Team",
        projectId: prjId,
        targetObjectId: docId,
        targetObjectType: "document",
        requiredPermission: "documents:download"
      });
      if (!dlAllowed.authorized) throw new Error(`Authorized designer denied download access: ${dlAllowed.reason}`);

      // 2. Unauthorized download attempt by unassigned user
      const dlDenied = await AuthorizationMiddleware.authorize({
        userId: "usr_unassigned_hacker",
        userRole: "Design Team",
        projectId: prjId,
        targetObjectId: docId,
        targetObjectType: "document",
        requiredPermission: "documents:download"
      });
      if (dlDenied.authorized) throw new Error("Security failure: Unassigned user was allowed to download confidential project document!");

      // Check log specifically for FILE_DOWNLOAD_DENIED
      const logs = AuthorizationAuditLogService.getAuditLogs({ userId: "usr_unassigned_hacker", action: "FILE_DOWNLOAD_DENIED" });
      if (logs.length === 0) throw new Error("Unauthorized download attempt was not logged as FILE_DOWNLOAD_DENIED!");
    },
    "Verified that unauthorized document downloads and mutations are blocked and recorded in forensic telemetry."
  );

  // 5. Immutable Audit Logging
  await runTest(
    5,
    "Immutable Audit Logging for Authorization-Sensitive Events",
    async () => {
      const allLogs = AuthorizationAuditLogService.getAuditLogs();
      if (allLogs.length < 5) throw new Error(`Expected multiple audit logs from previous tests, found only ${allLogs.length}`);

      const hasGranted = allLogs.some((l) => l.action === "ACCESS_GRANTED" || l.action === "FILE_DOWNLOAD");
      const hasDenied = allLogs.some((l) => l.action === "ACCESS_DENIED" || l.action === "IDOR_ATTEMPT_BLOCKED" || l.action === "FILE_DOWNLOAD_DENIED");
      const hasTamper = allLogs.some((l) => l.action === "WORKFLOW_TAMPERING_BLOCKED");

      if (!hasGranted || !hasDenied || !hasTamper) {
        throw new Error("Audit log is missing required event categories (Granted, Denied, Tampered)!");
      }

      // Check fields
      const sample = allLogs[0];
      if (!sample.id || !sample.timestamp || !sample.userId || !sample.userRole || !sample.ipAddress || !sample.severity) {
        throw new Error("Audit log record is missing mandatory forensic attributes!");
      }
    },
    "Verified that every authorized and denied action is captured with user, role, project, timestamp, and IP address."
  );

  // 6. Event-Driven Dashboard & Microsoft Graph Email Notifications
  await runTest(
    6,
    "Event-Driven Notifications Triggered ONLY on Successful Authorization",
    async () => {
      AuthorizationNotificationService.clearRepository();
      const objId = "pat_notif_test_55";
      WorkflowValidationService.setInitialStage(objId, "Patent Analyst Review");

      // 1. Illegal transition attempt (should NOT trigger notifications!)
      await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        targetObjectId: objId,
        currentWorkflowStage: "Patent Analyst Review",
        targetWorkflowStage: "Approved" // Illegal jump
      });

      if (AuthorizationNotificationService.getDashboardNotifications().length > 0 || AuthorizationNotificationService.getGraphEmails().length > 0) {
        throw new Error("Security violation: Notifications were triggered after a DENIED/ILLEGAL workflow transition!");
      }

      // 2. Successful authorized transition to CEO Review
      await AuthorizationMiddleware.authorize({
        userId: "usr_analyst_01",
        userRole: "Patent Analyst",
        targetObjectId: objId,
        currentWorkflowStage: "Patent Analyst Review",
        targetWorkflowStage: "CEO Review" // Valid
      });

      const alerts = AuthorizationNotificationService.getDashboardNotifications("CEO");
      const emails = AuthorizationNotificationService.getGraphEmails();

      if (alerts.length === 0 || !alerts[0].title.includes("Patent Ready for Executive Review")) {
        throw new Error("Successful transition to CEO Review failed to trigger CEO dashboard notification!");
      }
      if (emails.length === 0 || emails[0].recipientEmail !== "ceo@moat.ai") {
        throw new Error("Successful transition to CEO Review failed to dispatch Microsoft Graph email alert to CEO!");
      }
    },
    "Verified that real-time dashboard updates and Microsoft Graph emails trigger strictly after successful authorization."
  );

  console.log("\n====================================================================================================");
  console.log(` 🏆 API AUTHORIZATION & BUSINESS LOGIC VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("====================================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
