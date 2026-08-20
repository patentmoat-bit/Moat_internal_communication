import { NextRequest } from "next/server";
import { AllowListValidationService, AllowListException } from "../AllowListValidationService";
import { GlobalValidationMiddleware } from "../GlobalValidationMiddleware";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE ALLOW-LIST VALIDATION — VERIFICATION RUNNER (PHASE 9)");
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

function expectAllowListException(fn: () => void) {
  try {
    fn();
    throw new Error("Expected AllowListException was not thrown!");
  } catch (err: any) {
    if (err.message.includes("Expected AllowListException")) throw err;
    if (err instanceof AllowListException || err.code === "ALLOW_LIST_VIOLATION") {
      return true;
    }
    throw new Error(`Expected AllowListException, got: ${err.message}`);
  }
}

async function main() {
  // 1. Roles Allow-list
  await runTest(
    "1. Role Allow-List Enforcement",
    () => {
      AllowListValidationService.assertAllowedValue("admin", "roles", "Role");
      AllowListValidationService.assertAllowedValue("analyst", "roles", "Role");
      expectAllowListException(() => AllowListValidationService.assertAllowedValue("hacker", "roles", "Role"));
      expectAllowListException(() => AllowListValidationService.assertAllowedValue("root", "roles", "Role"));
    },
    "Enforced strict allow-list on user roles, permitting only authorized system roles (admin, analyst, etc.)."
  );

  // 2. Status Values Allow-list
  await runTest(
    "2. Status Value & Workflow Stage Allow-List Enforcement",
    () => {
      AllowListValidationService.assertAllowedValue("active", "status", "Status");
      AllowListValidationService.assertAllowedValue("under_review", "status", "Status");
      AllowListValidationService.assertAllowedValue("prior_art_search", "workflow_stages", "Stage");
      expectAllowListException(() => AllowListValidationService.assertAllowedValue("illegal_status", "status", "Status"));
    },
    "Validated status and workflow stage strings against authorized business lifecycle definitions."
  );

  // 3. Country Codes Allow-list
  await runTest(
    "3. Country Code Jurisdiction Allow-List Enforcement",
    () => {
      AllowListValidationService.assertAllowedValue("US", "country_codes", "Jurisdiction");
      AllowListValidationService.assertAllowedValue("EP", "country_codes", "Jurisdiction");
      AllowListValidationService.assertAllowedArray(["US", "WO", "JP"], "country_codes", "Jurisdictions");
      expectAllowListException(() => AllowListValidationService.assertAllowedValue("ZZ", "country_codes", "Jurisdiction"));
    },
    "Enforced valid 2-letter WIPO / ISO patent jurisdiction country codes."
  );

  // 4. File Extensions & MIME Types Allow-list
  await runTest(
    "4. File Extensions & MIME Types Allow-List Enforcement",
    () => {
      AllowListValidationService.assertAllowedFileExtension("patent_draft_2026.pdf");
      AllowListValidationService.assertAllowedMimeType("application/pdf");
      expectAllowListException(() => AllowListValidationService.assertAllowedFileExtension("exploit.exe"));
      expectAllowListException(() => AllowListValidationService.assertAllowedMimeType("application/x-msdownload"));
    },
    "Restricted uploads to approved document and image file extensions (.pdf, .docx, etc.) and MIME types."
  );

  // 5. Sort Fields & Filter Values Allow-list
  await runTest(
    "5. Sort Fields & Filter Values Allow-List Enforcement",
    () => {
      AllowListValidationService.assertAllowedSortAndFilter({
        sortBy: "created_at",
        sortOrder: "desc",
        filterBy: "jurisdiction",
        filters: { status: "active", category: "utility" },
      });
      expectAllowListException(() =>
        AllowListValidationService.assertAllowedSortAndFilter({
          sortBy: "password_hash",
        })
      );
    },
    "Protected query parameters by validating sortBy, sortOrder, and filter keys against strict white-lists."
  );

  // 6. GlobalValidationMiddleware Integration
  await runTest(
    "6. Global Validation Middleware Allow-List Integration",
    async () => {
      const body = JSON.stringify({ role: "hacker", jurisdiction: "US" });
      const req = new NextRequest("https://moat.ai/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });

      const res = await GlobalValidationMiddleware.validateJsonBody(req, {
        allowLists: {
          role: "roles",
          jurisdiction: "country_codes",
        },
      });

      if (res.isValid || !res.errorResponse) {
        throw new Error("Middleware failed to reject unauthorized role value!");
      }
      if (res.errorResponse.status !== 400) {
        throw new Error(`Expected status 400, got ${res.errorResponse.status}`);
      }
    },
    "Integrated Phase 9 allow-list enforcement directly into GlobalValidationMiddleware."
  );

  console.log("\n================================================================================");
  console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
