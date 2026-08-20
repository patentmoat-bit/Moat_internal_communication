import { InputSanitizationService } from "../InputSanitizationService";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE INPUT SANITIZATION — VERIFICATION RUNNER");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName: string, actual: any, condition: (res: any) => boolean, expectedDescription: string) {
  totalTests++;
  try {
    if (condition(actual)) {
      passedTests++;
      console.log(`[PASS] Req #${totalTests}: ${testName} — ${expectedDescription}`);
    } else {
      console.log(`[FAIL] Req #${totalTests}: ${testName} — Condition failed. Got:`, JSON.stringify(actual));
    }
  } catch (err: any) {
    console.log(`[FAIL] Req #${totalTests}: ${testName} — Exception:`, err.message);
  }
}

// 1. Text field sanitization
runTest(
  "1. Plaintext Title/Name Sanitization",
  InputSanitizationService.sanitizeText("<script>alert(1)</script>Patent Title with \u202eRTL override and \x00null byte; rm -rf / -- comment"),
  (res) => !res.includes("<script>") && !res.includes("\u202e") && !res.includes("\x00") && !res.includes("rm -rf") && !res.includes("--") && res.includes("Patent Title"),
  "Stripped HTML tags, control chars, RTL overrides, shell commands, and SQL comments."
);

// 2. Rich text / Patent description sanitization
runTest(
  "2. Rich Text & Patent Claim Sanitization",
  InputSanitizationService.sanitizeRichText("<p>Claim 1: A system comprising a neural network.</p><script>evil()</script><span onerror='alert(1)' style='color:red'>Bold text</span><iframe src='http://evil.com'></iframe>"),
  (res) => res.includes("<p>Claim 1: A system comprising a neural network.</p>") && !res.includes("<script>") && !res.includes("onerror") && !res.includes("<iframe") && !res.includes("style="),
  "Preserved safe <p> tag while eliminating <script>, <iframe>, and inline onerror/style attributes."
);

// 3. Comment sanitization
runTest(
  "3. Executive Feedback & Comment Sanitization",
  InputSanitizationService.sanitizeComment("Approved by CEO. <img src=x onerror=alert(1)> -- DROP TABLE users; $(cat /etc/passwd)"),
  (res) => !res.includes("<img") && !res.includes("onerror") && !res.includes("--") && !res.includes("$(cat") && res.includes("Approved by CEO"),
  "Sanitized executive note against XSS, SQL comments, and command substitution."
);

// 4. Search query sanitization
runTest(
  "4. Search Query Normalization & Operator Stripping",
  InputSanitizationService.sanitizeSearchQuery("quantum computing \x00 \x1f $where $ne %00 ; || &&"),
  (res) => !res.includes("\x00") && !res.includes("$where") && !res.includes("$ne") && !res.includes("||") && !res.includes("&&") && res.includes("quantum computing"),
  "Eliminated NoSQL operator wildcards ($where, $ne), control bytes, and shell operators."
);

// 5. Email subject sanitization (CRLF check)
runTest(
  "5. Email Subject CRLF Header Injection Defense",
  InputSanitizationService.sanitizeEmailSubject("Urgent Alert\r\nBcc: attacker@evil.com\r\nSubject: Spoofed Subject"),
  (res) => !res.includes("\r") && !res.includes("\n") && !res.includes("Bcc:\r\n") && res.includes("Urgent Alert"),
  "Stripped carriage returns and line feeds to prevent Email Header Injection."
);

// 6. Email body sanitization
runTest(
  "6. Email Body HTML Template Sanitization",
  InputSanitizationService.sanitizeEmailBody("<h1>Alert Notification</h1><a href='javascript:alert(1)'>Click to verify</a>"),
  (res) => res.includes("<h1>Alert Notification</h1>") && !res.includes("javascript:"),
  "Sanitized email body and blocked dangerous javascript: URI scheme."
);

// 7. File name sanitization & DOS device name check
runTest(
  "7. File Name Traversal & DOS Device Name Protection",
  {
    traversal: InputSanitizationService.sanitizeFileName("../../etc/passwd\x00.htaccess"),
    dosDevice: InputSanitizationService.sanitizeFileName("CON.txt"),
  },
  (res) => !res.traversal.includes("..") && !res.traversal.includes("/") && !res.traversal.includes("\x00") && res.dosDevice.startsWith("safe_CON"),
  "Replaced directory traversal paths and prefixed Windows/DOS reserved device name CON.txt."
);

// 8. Recursive payload sanitization
runTest(
  "8. Context-Aware Recursive Payload Sanitization",
  InputSanitizationService.sanitizePayload({
    title: "<script>alert(1)</script>Patent Title",
    description: "<p>Safe claim</p><script>evil()</script>",
    searchQuery: "AI $where $ne",
    emailSubject: "Test\r\nBcc: hacker@moat.ai",
    fileName: "../../secret.pdf",
  }),
  (res) =>
    res.title === "Patent Title" &&
    res.description === "<p>Safe claim</p>" &&
    res.searchQuery.includes("AI") && !res.searchQuery.includes("$where") &&
    !res.emailSubject.includes("\r\n") &&
    !res.fileName.includes(".."),
  "Automatically applied correct sanitization rules across mixed payload attributes."
);

console.log("\n================================================================================");
console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
