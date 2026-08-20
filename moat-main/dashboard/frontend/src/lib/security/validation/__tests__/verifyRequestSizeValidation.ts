import { NextRequest } from "next/server";
import { RequestSizeValidationService, RequestSizeException } from "../RequestSizeValidationService";
import { GlobalValidationMiddleware } from "../GlobalValidationMiddleware";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE REQUEST SIZE VALIDATION — VERIFICATION RUNNER");
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

function expectHttp413(fn: () => void) {
  try {
    fn();
    throw new Error("Expected RequestSizeException with HTTP 413 was not thrown!");
  } catch (err: any) {
    if (err.message.includes("Expected RequestSizeException")) throw err;
    if (err instanceof RequestSizeException && err.statusCode === 413) {
      return true;
    }
    if (err.statusCode === 413 || err.code === "PAYLOAD_TOO_LARGE") {
      return true;
    }
    throw new Error(`Expected HTTP 413 RequestSizeException, got: ${err.message} (status: ${err.statusCode})`);
  }
}

async function main() {
  // 1. JSON Request Size Limit (1 MB)
  await runTest(
    "1. JSON Request Size Threshold Enforcement (1 MB)",
    () => {
      // Valid 500 KB JSON payload passes
      const validJson = "A".repeat(500 * 1024);
      RequestSizeValidationService.assertPayloadSize(validJson, "json", "JSON payload");

      // Oversized 1.1 MB JSON payload must throw HTTP 413
      const oversizedJson = "A".repeat(1100 * 1024);
      expectHttp413(() => RequestSizeValidationService.assertPayloadSize(oversizedJson, "json", "JSON payload"));
    },
    "Enforced 1 MB limit on JSON payloads and rejected oversized requests with HTTP 413."
  );

  // 2. Search Payload Limit (50 KB)
  await runTest(
    "2. Search Query Payload Size Enforcement (50 KB)",
    () => {
      // Valid 30 KB search payload passes
      RequestSizeValidationService.assertPayloadSize("Q".repeat(30 * 1024), "search", "Search payload");

      // Oversized 60 KB search payload must throw HTTP 413
      expectHttp413(() => RequestSizeValidationService.assertPayloadSize("Q".repeat(60 * 1024), "search", "Search payload"));
    },
    "Enforced 50 KB limit on search query payloads to prevent complex regex / query DoS."
  );

  // 3. Comment Payload Limit (5 KB)
  await runTest(
    "3. Comment Submission Size Enforcement (5 KB)",
    () => {
      // Valid 2 KB comment passes
      RequestSizeValidationService.assertPayloadSize("Nice patent analysis!", "comment", "Comment payload");

      // Oversized 6 KB comment must throw HTTP 413
      expectHttp413(() => RequestSizeValidationService.assertPayloadSize("C".repeat(6 * 1024), "comment", "Comment payload"));
    },
    "Enforced 5 KB limit on user comments and annotations."
  );

  // 4. Configurable File Upload Limit
  await runTest(
    "4. Configurable File Upload Thresholds",
    () => {
      // 5 MB file upload against default 10 MB passes
      RequestSizeValidationService.assertPayloadSize(5 * 1024 * 1024, "file", "File upload Content-Length");

      // 15 MB upload against default 10 MB fails
      expectHttp413(() => RequestSizeValidationService.assertPayloadSize(15 * 1024 * 1024, "file", "File upload Content-Length"));

      // Custom configurable limit (2 MB threshold)
      const customLimit = 2 * 1024 * 1024;
      expectHttp413(() => RequestSizeValidationService.assertPayloadSize(3 * 1024 * 1024, "file", "Custom file upload", customLimit));
    },
    "Supported configurable file upload bounds and rejected uploads exceeding designated limits with HTTP 413."
  );

  // 5. Field-Level Size Validation
  await runTest(
    "5. Compound JSON Field-Level Size Enforcement",
    () => {
      const compoundPayload = {
        patentId: "US-2026-991",
        commentText: "X".repeat(6 * 1024), // Exceeds 5 KB comment limit!
        metadata: { author: "analyst" },
      };

      expectHttp413(() =>
        RequestSizeValidationService.assertFieldSizes(compoundPayload, {
          commentText: "comment",
          patentId: "json",
        })
      );
    },
    "Validated individual field byte lengths within compound JSON request structures."
  );

  // 6. GlobalValidationMiddleware HTTP 413 Integration
  await runTest(
    "6. Global Validation Middleware HTTP 413 Integration",
    async () => {
      const hugeBody = JSON.stringify({ commentText: "Z".repeat(10 * 1024) });
      const req = new NextRequest("https://moat.ai/api/comments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: hugeBody,
      });

      const res = await GlobalValidationMiddleware.validateJsonBody(req, {
        payloadSizeCategory: "comment",
      });

      if (res.isValid || !res.errorResponse) {
        throw new Error("Middleware failed to reject oversized comment payload!");
      }
      if (res.errorResponse.status !== 413) {
        throw new Error(`Expected middleware status 413, got ${res.errorResponse.status}`);
      }
    },
    "Integrated Phase 8 size checks directly into GlobalValidationMiddleware, returning standardized HTTP 413 JSON error responses."
  );

  console.log("\n================================================================================");
  console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
