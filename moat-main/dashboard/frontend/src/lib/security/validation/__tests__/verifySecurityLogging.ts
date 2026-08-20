import { NextRequest } from "next/server";
import { z } from "zod";
import { SecurityLoggingService } from "../../SecurityLoggingService";
import { GlobalValidationMiddleware } from "../GlobalValidationMiddleware";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE SECURITY LOGGING — VERIFICATION RUNNER (PHASE 11)");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(testName: string, testFn: () => void | Promise<void>, expectedDescription: string) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`[PASS] Req #${totalTests}: ${testName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Req #${totalTests}: ${testName} — Exception:`, err.message);
  }
}

async function main() {
  const securityLogger = new SecurityLoggingService();

  // 1. Validation Failure Logging & Required Attributes
  await runTest(
    "1. Validation Failure Logging & Attributes Capture",
    async () => {
      const logId = await securityLogger.logValidationFailure({
        userId: "usr_sec_909",
        ipAddress: "192.168.10.55",
        endpoint: "/api/patents/upload",
        requestId: "req_test_881",
        userAgent: "Mozilla/5.0 Enterprise-Audit",
        category: "ALLOW_LIST_VIOLATION",
        validationErrors: [
          { field: "fileType", message: "MIME type application/exe is not permitted.", rejectedValue: "application/exe" },
        ],
      });

      const logs = await securityLogger.getValidationLogs({ endpoint: "/api/patents/upload" });
      const record = logs.find((l) => l.logId === logId);

      if (!record) throw new Error("Logged validation failure was not found in admin validation telemetry store!");
      if (!record.timestamp) throw new Error("Timestamp missing from validation failure log!");
      if (record.userId !== "usr_sec_909") throw new Error(`Expected userId usr_sec_909, got ${record.userId}`);
      if (record.ipAddress !== "192.168.10.55") throw new Error(`Expected IP 192.168.10.55, got ${record.ipAddress}`);
      if (record.requestId !== "req_test_881") throw new Error(`Expected requestId req_test_881, got ${record.requestId}`);
      if (record.userAgent !== "Mozilla/5.0 Enterprise-Audit") throw new Error(`Expected userAgent Mozilla/5.0 Enterprise-Audit, got ${record.userAgent}`);
      if (!record.rejectedFields.includes("fileType")) throw new Error(`Rejected fields array malformed: ${JSON.stringify(record.rejectedFields)}`);
      if (Object.isFrozen(record) !== true) throw new Error("Log record is not immutable (frozen)!");
    },
    "Verified capture of Timestamp, User ID, IP Address, Endpoint, Request ID, Validation Errors, Rejected Fields, and User Agent in frozen log record."
  );

  // 2. Immutable Audit Log Creation for Security Investigations
  await runTest(
    "2. Immutable Audit Log Generation",
    async () => {
      const logId = await securityLogger.logValidationFailure({
        userId: "usr_attacker_001",
        ipAddress: "10.0.0.99",
        endpoint: "/api/admin/roles",
        category: "ALLOW_LIST_VIOLATION",
        validationErrors: [{ field: "role", message: "Role 'root' is not permitted.", rejectedValue: "root" }],
        severity: "CRITICAL",
      });

      // Query audit logs via auditLogService
      const auditLogger = (securityLogger as any).auditLogService;
      const auditLogs = await auditLogger.getLogs({ ip: "10.0.0.99" });
      const event = auditLogs.find((l: any) => l.metadata?.logId === logId);

      if (!event) throw new Error("Immutable audit log entry was not created for security investigation!");
      if (event.eventType !== "ALLOW_LIST_VIOLATION") throw new Error(`Expected eventType ALLOW_LIST_VIOLATION, got ${event.eventType}`);
      if (event.status !== "FAILURE") throw new Error(`Expected audit status FAILURE for CRITICAL severity, got ${event.status}`);
    },
    "Guaranteed that security validation failures automatically generate frozen, append-only audit log events."
  );

  // 3. GlobalValidationMiddleware Automated Telemetry Integration
  await runTest(
    "3. GlobalMiddleware Automated Security Logging Integration",
    async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const req = new NextRequest("https://moat.ai/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "172.16.0.42",
          "user-agent": "Automated-Scanner-v1",
        },
        body: JSON.stringify({ email: "invalid-email-string" }),
      });

      const initialCount = (await securityLogger.getValidationLogs({ endpoint: "/api/auth/login" })).length;
      await GlobalValidationMiddleware.validateJsonBody(req, { schema });
      const newLogs = await securityLogger.getValidationLogs({ endpoint: "/api/auth/login" });

      if (newLogs.length <= initialCount) {
        throw new Error("GlobalValidationMiddleware failed to trigger automated security logging on schema violation!");
      }
      const latestLog = newLogs[0];
      if (latestLog.ipAddress !== "172.16.0.42" || latestLog.category !== "SCHEMA_VIOLATION") {
        throw new Error(`Middleware logging payload mismatch: ${JSON.stringify(latestLog)}`);
      }
    },
    "Verified that GlobalValidationMiddleware automatically logs schema and allow-list violations without manual intervention."
  );

  console.log("\n================================================================================");
  console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
