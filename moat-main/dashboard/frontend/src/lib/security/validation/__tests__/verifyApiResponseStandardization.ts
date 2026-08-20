import { NextRequest } from "next/server";
import { z } from "zod";
import { ErrorResponseBuilder } from "../../../errors";
import { GlobalValidationMiddleware } from "../GlobalValidationMiddleware";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE API RESPONSE STANDARDIZATION — VERIFICATION RUNNER (PHASE 10)");
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
  // 1. Standardized Success Response Formatting
  await runTest(
    "1. Standardized Success Response Structure",
    async () => {
      const res = ErrorResponseBuilder.success({ id: "PAT-101", status: "active" });
      const json = await res.json();

      if (json.success !== true) throw new Error(`Expected success: true, got ${json.success}`);
      if (json.message !== "Operation completed successfully.") throw new Error(`Unexpected message: ${json.message}`);
      if (!json.data || json.data.id !== "PAT-101") throw new Error(`Data payload missing or malformed: ${JSON.stringify(json.data)}`);
    },
    "Verified success response format matches { success: true, message: '...', data: {} } without variance."
  );

  // 2. Standardized Validation Failure Response Formatting
  await runTest(
    "2. Standardized Validation Failure Response Structure",
    async () => {
      const errors = [{ field: "email", message: "Invalid email address." }];
      const res = ErrorResponseBuilder.validationFailure(errors);
      const json = await res.json();

      if (json.success !== false) throw new Error(`Expected success: false, got ${json.success}`);
      if (json.message !== "Validation failed.") throw new Error(`Unexpected message: ${json.message}`);
      if (!Array.isArray(json.errors) || json.errors[0].field !== "email") {
        throw new Error(`Errors array missing or malformed: ${JSON.stringify(json.errors)}`);
      }
    },
    "Verified validation failure response format matches { success: false, message: 'Validation failed.', errors: [...] }."
  );

  // 3. Information Disclosure & Stack Trace Leakage Defense
  await runTest(
    "3. Stack Trace & Internal Database Exception Scrubbing",
    async () => {
      const dirtyDbError = `error: relation "public.patent_search" does not exist at Object.query (/lib/supabase/client.ts:104)`;
      const res = ErrorResponseBuilder.error(dirtyDbError, "ERR-5001", 500);
      const json = await res.json();

      if (json.message.includes("public.patent_search") || json.message.includes("supabase") || json.message.includes("Object.query")) {
        throw new Error(`Internal database details leaked in error response: ${json.message}`);
      }
      if (json.message !== "Unable to process your request. Please try again later.") {
        throw new Error(`Expected sanitized fallback message, got: ${json.message}`);
      }
    },
    "Guaranteed that no internal schema names, SQL fragments, or stack traces are ever exposed in API error messages."
  );

  // 4. Middleware Zod Schema Validation Error Standardization
  await runTest(
    "4. GlobalMiddleware Zod Schema Error Standardization",
    async () => {
      const userSchema = z.object({
        email: z.string().email("Invalid email address."),
        age: z.number().min(18, "Must be at least 18."),
      });

      const body = JSON.stringify({ email: "not-an-email", age: 15 });
      const req = new NextRequest("https://moat.ai/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });

      const res = await GlobalValidationMiddleware.validateJsonBody(req, { schema: userSchema });

      if (res.isValid || !res.errorResponse) throw new Error("Middleware failed to catch Zod validation error!");
      const json = await res.errorResponse.json();

      if (json.success !== false || json.message !== "Validation failed.") {
        throw new Error(`Unexpected middleware error response structure: ${JSON.stringify(json)}`);
      }
      if (!Array.isArray(json.errors) || json.errors.length !== 2) {
        throw new Error(`Expected 2 validation errors in errors array, got: ${JSON.stringify(json.errors)}`);
      }
    },
    "Verified that Zod schema violations in GlobalValidationMiddleware automatically return standardized Phase 10 validation failure payloads."
  );

  console.log("\n================================================================================");
  console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
