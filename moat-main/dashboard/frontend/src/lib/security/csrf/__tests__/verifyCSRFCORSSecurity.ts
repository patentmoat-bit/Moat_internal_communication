import {
  CSRFTokenService,
  OriginValidationService,
  CORSOptionsService,
  CSRFAuditLogService,
  CSRFCORSMiddleware,
  CSRFCORSRequestContext,
  DEFAULT_CORS_CONFIG
} from "../index";

console.log("====================================================================================================");
console.log(" 🛡️ MOAT PHASE 6 — CSRF PROTECTION & CORS HARDENING MASTER VERIFICATION SUITE");
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
  CSRFTokenService.clearRepository();
  CSRFAuditLogService.clearRepository();

  // 1. CSRF Token Generation & Validation
  await runTest(
    1,
    "CSRF Token Generation & Validation",
    async () => {
      const { token } = CSRFTokenService.generateToken("usr_secure_1", "sess_9900");

      // 1. Valid token on state-changing POST request
      const validRes = CSRFTokenService.validateToken(token, "usr_secure_1", "sess_9900");
      if (!validRes.valid) throw new Error(`Valid CSRF token was rejected: ${validRes.reason}`);

      // 2. Tampered / invalid token
      const invalidRes = CSRFTokenService.validateToken("tampered_token.invalid_signature", "usr_secure_1", "sess_9900");
      if (invalidRes.valid || invalidRes.errorType !== "CSRF_TOKEN_INVALID") {
        throw new Error("Failed to block invalid or tampered CSRF token!");
      }

      // 3. Missing token
      const missingRes = CSRFTokenService.validateToken("", "usr_secure_1", "sess_9900");
      if (missingRes.valid || missingRes.errorType !== "CSRF_TOKEN_MISSING") {
        throw new Error("Failed to block request with missing CSRF token!");
      }

      // Also verify via middleware to generate audit log
      await CSRFCORSMiddleware.validateRequest({
        endpoint: "/api/patents/update",
        httpMethod: "POST",
        ipAddress: "10.0.0.5",
        originHeader: "https://moat.ai",
        csrfTokenHeader: "tampered_token"
      });
    },
    "Verified cryptographic token issuance and rejection of missing or tampered tokens."
  );

  // 2. SameSite, Secure, and HttpOnly Cookie Standards
  await runTest(
    2,
    "SameSite, Secure, and HttpOnly Cookie Hardening",
    async () => {
      const { cookies } = CSRFTokenService.generateToken("usr_secure_2", "sess_8800");

      if (cookies.length !== 2) {
        throw new Error(`Expected 2 secure cookies (XSRF-TOKEN and __Host-moat-csrf-auth), got ${cookies.length}`);
      }

      for (const cookie of cookies) {
        if (cookie.sameSite !== "strict") {
          throw new Error(`Cookie '${cookie.name}' fails SameSite=Strict enforcement! Found: '${cookie.sameSite}'`);
        }
        if (!cookie.secure) {
          throw new Error(`Cookie '${cookie.name}' fails Secure=true HTTPS flag enforcement!`);
        }
      }

      const auditCookie = cookies.find((c) => c.name === "__Host-moat-csrf-auth");
      if (!auditCookie || !auditCookie.httpOnly) {
        throw new Error("Sensitive signature verification cookie '__Host-moat-csrf-auth' fails HttpOnly=true enforcement!");
      }
    },
    "Verified cookies enforce SameSite=Strict, Secure=true, and HttpOnly flag on sensitive tokens."
  );

  // 3. Origin & Referer Validation
  await runTest(
    3,
    "Origin & Referer Validation on State-Changing Requests",
    async () => {
      // 1. Valid origin
      const validOrig = OriginValidationService.validateOrigin("https://moat.ai", null, "POST");
      if (!validOrig.allowed) throw new Error(`Valid origin 'https://moat.ai' was blocked: ${validOrig.reason}`);

      // 2. Missing origin and referer on POST request -> must be blocked!
      const missingOrig = OriginValidationService.validateOrigin(null, null, "POST");
      if (missingOrig.allowed || missingOrig.errorType !== "ORIGIN_MISSING_ON_STATE_CHANGE") {
        throw new Error("Security policy failed to block state-changing POST request lacking Origin and Referer headers!");
      }

      // Also verify via middleware to generate audit log
      await CSRFCORSMiddleware.validateRequest({
        endpoint: "/api/patents/delete",
        httpMethod: "DELETE",
        ipAddress: "10.0.0.6",
        originHeader: null,
        refererHeader: null
      });
    },
    "Verified Origin/Referer headers are checked and mandatory on state-changing API requests."
  );

  // 4. Strict CORS Allow List & Block Unknown Origins
  await runTest(
    4,
    "Strict CORS Allow List & Unknown Origin Blocking",
    async () => {
      const evilOrigin = "https://hacker-evilsite.com";
      const corsRes = OriginValidationService.validateOrigin(evilOrigin, null, "GET");
      if (corsRes.allowed || corsRes.errorType !== "CORS_ORIGIN_BLOCKED") {
        throw new Error(`CORS security failed to block unknown origin '${evilOrigin}'!`);
      }

      // Verify via middleware
      const ctx: CSRFCORSRequestContext = {
        endpoint: "/api/protected/data",
        httpMethod: "GET",
        ipAddress: "192.168.1.100",
        originHeader: evilOrigin
      };
      const midRes = await CSRFCORSMiddleware.validateRequest(ctx);
      if (midRes.allowed || midRes.violationType !== "CORS_ORIGIN_BLOCKED") {
        throw new Error("CSRFCORSMiddleware failed to reject unknown origin with CORS violation!");
      }
    },
    "Verified requests from unknown origins are blocked and logged as CORS violations."
  );

  // 5. Secure HTTP Headers & OPTIONS Preflight Validation
  await runTest(
    5,
    "Secure HTTP Headers & OPTIONS Preflight Validation",
    async () => {
      // 1. Valid preflight OPTIONS request
      const validPre = CORSOptionsService.validatePreflight("https://app.moat.ai", "POST", "X-CSRF-Token, Content-Type");
      if (!validPre.allowed) throw new Error(`Valid preflight request was rejected: ${validPre.reason}`);

      if (!validPre.corsHeaders["Access-Control-Allow-Origin"] || !validPre.corsHeaders["Access-Control-Allow-Methods"]) {
        throw new Error("Preflight response is missing required CORS HTTP headers!");
      }

      // 2. Preflight for prohibited method (TRACE)
      const badMethod = CORSOptionsService.validatePreflight("https://app.moat.ai", "TRACE", "Content-Type");
      if (badMethod.allowed || badMethod.errorType !== "CORS_METHOD_BLOCKED") {
        throw new Error("Preflight failed to block prohibited HTTP method 'TRACE'!");
      }

      // Verify via middleware to generate audit logs
      await CSRFCORSMiddleware.validateRequest({
        endpoint: "/api/patents/create",
        httpMethod: "OPTIONS",
        ipAddress: "10.0.0.7",
        originHeader: "https://app.moat.ai",
        requestMethodHeader: "POST",
        requestHeadersHeader: "X-CSRF-Token, Content-Type"
      });
      await CSRFCORSMiddleware.validateRequest({
        endpoint: "/api/patents/create",
        httpMethod: "OPTIONS",
        ipAddress: "10.0.0.8",
        originHeader: "https://app.moat.ai",
        requestMethodHeader: "TRACE",
        requestHeadersHeader: "Content-Type"
      });
    },
    "Verified strict OPTIONS preflight handling and secure Access-Control response header generation."
  );

  // 6. CORS & CSRF Audit Logs
  await runTest(
    6,
    "Immutable CORS & CSRF Forensic Audit Logging",
    async () => {
      const logs = CSRFAuditLogService.getAuditLogs();
      if (logs.length < 2) {
        throw new Error(`Expected multiple CORS/CSRF audit logs from previous test steps, got ${logs.length}`);
      }

      const blockedOriginLog = logs.find((l) => l.violationType === "CORS_ORIGIN_BLOCKED");
      if (!blockedOriginLog) {
        throw new Error("Audit repository failed to capture CORS_ORIGIN_BLOCKED violation log!");
      }

      if (!blockedOriginLog.ipAddress || !blockedOriginLog.endpoint || !blockedOriginLog.timestamp || !blockedOriginLog.severity) {
        throw new Error("Audit log record is missing mandatory forensic attributes!");
      }

      // Test immutability
      try {
        (blockedOriginLog as any).details = "TAMPERED_DETAILS";
        throw new Error("Immutability failure: Audit log record was successfully mutated in memory!");
      } catch (err: any) {
        if (err.message.includes("Immutability failure")) throw err;
        // Object.freeze protected record -> PASS!
      }
    },
    "Verified all CORS/CSRF events and violations are immutably logged with IP, Origin, endpoint, and severity."
  );

  console.log("\n====================================================================================================");
  console.log(` 🏆 CSRF PROTECTION & CORS HARDENING VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("====================================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
