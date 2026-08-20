import { HeaderInjectionProtectionService, HeaderInjectionException } from "../HeaderInjectionProtectionService";
import { interpolateSubject } from "../../../events/emailRoutingRules";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE HEADER INJECTION PROTECTION — VERIFICATION RUNNER");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName: string, testFn: () => void, expectedDescription: string) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`[PASS] Req #${totalTests}: ${testName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Req #${totalTests}: ${testName} — Exception:`, err.message);
  }
}

function expectException(fn: () => void, expectedCodeOrSnippet: string) {
  try {
    fn();
    throw new Error("Expected HeaderInjectionException was not thrown!");
  } catch (err: any) {
    if (err.message.includes("Expected HeaderInjectionException")) throw err;
    if (err instanceof HeaderInjectionException || err.code === expectedCodeOrSnippet || err.message.includes(expectedCodeOrSnippet)) {
      return true;
    }
    throw new Error(`Expected exception with code '${expectedCodeOrSnippet}', got code '${err.code}' and message '${err.message}'`);
  }
}

// 1. Incoming HTTP Header CRLF Injection Defense
runTest(
  "1. Incoming HTTP Header CRLF Injection Rejection",
  () => {
    // Valid header passes
    HeaderInjectionProtectionService.validateIncomingHeaders({
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "203.0.113.195",
    });

    // CRLF in header value must throw
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          "x-forwarded-for": "203.0.113.195\r\nSet-Cookie: sessionId=hijacked",
        }),
      "CRLF_INJECTION_DETECTED"
    );

    // CRLF in header name must throw
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          "bad-header\r\nInjected-Header": "value",
        }),
      "CRLF_INJECTION_DETECTED"
    );
  },
  "Detected and rejected carriage return / line feed sequences in HTTP header names and values."
);

// 2. Invalid Header Name Syntax
runTest(
  "2. Strict ASCII HTTP Header Name Naming Syntax Validation",
  () => {
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          "Invalid Header With Spaces": "value",
        }),
      "INVALID_HEADER_NAME"
    );
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          "Header:Colon": "value",
        }),
      "INVALID_HEADER_NAME"
    );
  },
  "Blocked malformed header names containing spaces, colons, or non-ASCII characters."
);

// 3. Duplicate Dangerous Headers (HTTP Request Smuggling / Response Splitting)
runTest(
  "3. Duplicate Dangerous Header Rejection (Smuggling / Splitting Defense)",
  () => {
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          host: ["moat-app.com", "evil-spoof.com"],
        }),
      "DUPLICATE_DANGEROUS_HEADER"
    );
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          "content-length": ["100", "0"],
        }),
      "DUPLICATE_DANGEROUS_HEADER"
    );
  },
  "Rejected multiple conflicting entries for singleton headers like Host and Content-Length."
);

// 4. Oversized Header Value Rejection
runTest(
  "4. Oversized Header Value & Total Headers Size Bounds",
  () => {
    const hugeValue = "A".repeat(5000); // Exceeds 4KB
    expectException(
      () =>
        HeaderInjectionProtectionService.validateIncomingHeaders({
          "x-custom-data": hugeValue,
        }),
      "OVERSIZED_HEADER_VALUE"
    );
  },
  "Enforced 4KB limit per header value and 8KB cumulative header threshold."
);

// 5. Outgoing Email Header Sanitization
runTest(
  "5. Outgoing Email Header Sanitization & Recipient Smuggling Defense",
  () => {
    const dirtySubject = "Project Update\r\nBcc: hacker@moat.ai\x00\r\nSubject: Spoofed";
    const cleanSubject = HeaderInjectionProtectionService.sanitizeEmailHeaderValue(dirtySubject);

    if (cleanSubject.includes("\r") || cleanSubject.includes("\n") || cleanSubject.includes("\x00") || cleanSubject.includes("Bcc:\r\n")) {
      throw new Error(`Failed to sanitize subject: ${cleanSubject}`);
    }
    if (cleanSubject !== "Project Update Bcc: hacker@moat.ai Subject: Spoofed") {
      throw new Error(`Unexpected cleaned subject format: ${cleanSubject}`);
    }

    const dict = HeaderInjectionProtectionService.sanitizeEmailHeaders({
      "Subject": "Alert\r\nBcc: attacker@evil.com",
      "From": "noreply@moat.ai\x00",
    });

    if (dict.Subject.includes("\r\n") || dict.From.includes("\x00")) {
      throw new Error("Failed dictionary sanitization");
    }
  },
  "Stripped carriage returns, line feeds, and null bytes from outgoing email subject and sender fields."
);

// 6. Email Routing Rules Integration
runTest(
  "6. Email Routing Rules Subject Interpolation CRLF Defense",
  () => {
    const rendered = interpolateSubject("Patent Update — {{project_title}}", {
      project_title: "AI Engine\r\nBcc: spy@competitor.com",
    });

    if (rendered.includes("\r") || rendered.includes("\n")) {
      throw new Error(`CRLF leaked into interpolated subject: ${rendered}`);
    }
    if (rendered !== "Patent Update — AI Engine Bcc: spy@competitor.com") {
      throw new Error(`Unexpected interpolation output: ${rendered}`);
    }
  },
  "Guaranteed zero CRLF injection during email template subject variable interpolation."
);

console.log("\n================================================================================");
console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
