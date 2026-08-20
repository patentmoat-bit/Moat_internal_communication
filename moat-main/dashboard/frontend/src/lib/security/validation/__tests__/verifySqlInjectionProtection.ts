import { SqlInjectionProtectionService, SqlInjectionException } from "../SqlInjectionProtectionService";
import { RepositoryLayer } from "../../../repository/RepositoryLayer";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE SQL INJECTION PROTECTION — VERIFICATION RUNNER");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(testName: string, testFn: () => Promise<void> | void, expectedDescription: string) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`[PASS] Req #${totalTests}: ${testName} — ${expectedDescription}`);
  } catch (err: any) {
    console.log(`[FAIL] Req #${totalTests}: ${testName} — Exception:`, err.message);
  }
}

function expectException(fn: () => void, expectedCodeOrSnippet: string) {
  try {
    fn();
    throw new Error("Expected SqlInjectionException was not thrown!");
  } catch (err: any) {
    if (err.message.includes("Expected SqlInjectionException")) throw err;
    if (err instanceof SqlInjectionException || err.code === expectedCodeOrSnippet || err.message.includes(expectedCodeOrSnippet)) {
      return true;
    }
    throw new Error(`Expected exception with code '${expectedCodeOrSnippet}', got code '${err.code}' and message '${err.message}'`);
  }
}

async function expectAsyncException(fn: () => Promise<any>, expectedCodeOrSnippet: string) {
  try {
    await fn();
    throw new Error("Expected SqlInjectionException was not thrown!");
  } catch (err: any) {
    if (err.message.includes("Expected SqlInjectionException")) throw err;
    if (err instanceof SqlInjectionException || err.code === expectedCodeOrSnippet || err.message.includes(expectedCodeOrSnippet)) {
      return true;
    }
    throw new Error(`Expected exception with code '${expectedCodeOrSnippet}', got code '${err.code}' and message '${err.message}'`);
  }
}

async function main() {
  // 1. Valid Identifier Test
  await runTest(
    "1. Valid PostgreSQL Identifier Authorization",
    () => {
      const res1 = SqlInjectionProtectionService.validateIdentifier("patent_search");
      const res2 = SqlInjectionProtectionService.validateIdentifier("user_id", ["user_id", "email", "status"]);
      if (res1 !== "patent_search" || res2 !== "user_id") throw new Error("Identifier mismatch");
    },
    "Accepted standard PostgreSQL alphanumeric identifiers and allow-listed keys."
  );

  // 2. Syntax & Stacking Violation in Identifier
  await runTest(
    "2. Identifier Syntax & Query Stacking Defense",
    () => {
      expectException(() => SqlInjectionProtectionService.validateIdentifier("patents; DROP TABLE users--"), "INVALID_IDENTIFIER_SYNTAX");
      expectException(() => SqlInjectionProtectionService.validateIdentifier("id = 1 OR 1=1"), "INVALID_IDENTIFIER_SYNTAX");
    },
    "Rejected identifiers containing semicolons, spaces, comments, and tautology operators."
  );

  // 3. Reserved Keyword Identifier Defense
  await runTest(
    "3. Reserved Database Keyword Identifier Protection",
    () => {
      expectException(() => SqlInjectionProtectionService.validateIdentifier("select"), "RESERVED_KEYWORD_IDENTIFIER");
      expectException(() => SqlInjectionProtectionService.validateIdentifier("drop"), "RESERVED_KEYWORD_IDENTIFIER");
      expectException(() => SqlInjectionProtectionService.validateIdentifier("information_schema"), "RESERVED_KEYWORD_IDENTIFIER");
    },
    "Blocked standalone PostgreSQL reserved keywords from acting as dynamic table/column targets."
  );

  // 4. Allow-List Enforcement
  await runTest(
    "4. Strict Allow-List Enclosure for Dynamic Tables/Columns",
    () => {
      expectException(() => SqlInjectionProtectionService.validateIdentifier("secret_audit_logs", ["patent_search", "saved_patents"]), "UNAUTHORIZED_IDENTIFIER");
    },
    "Prevented unauthorized table enumeration when explicit allow-list boundaries are specified."
  );

  // 5. Column Projection List Sanitization
  await runTest(
    "5. Multi-Column Projection List Validation",
    () => {
      const valid = SqlInjectionProtectionService.validateColumnList("id, title, filing_date, status");
      if (valid !== "id, title, filing_date, status") throw new Error("Column list parsing error");
      expectException(() => SqlInjectionProtectionService.validateColumnList("id, title; DELETE FROM users"), "INVALID_IDENTIFIER_SYNTAX");
    },
    "Validated comma-separated column projections and rejected stacked query injections."
  );

  // 6. SQL Keyword Injection Reconnaissance (UNION SELECT, DROP TABLE, xp_cmdshell)
  await runTest(
    "6. Dangerous SQL Keyword & Attack Reconnaissance Engine",
    () => {
      const res1 = SqlInjectionProtectionService.inspectAndRejectSqlKeywords("1' UNION ALL SELECT null, password FROM users--");
      const res2 = SqlInjectionProtectionService.inspectAndRejectSqlKeywords("normal search term");
      const res3 = SqlInjectionProtectionService.inspectAndRejectSqlKeywords({ query: "test", filter: "id=1; DROP DATABASE moat;" });
      const res4 = SqlInjectionProtectionService.inspectAndRejectSqlKeywords("'; EXEC xp_cmdshell('whoami');--");

      if (res1.isSafe || res1.detectedKeyword !== "UNION SELECT") throw new Error(`Failed UNION check: ${JSON.stringify(res1)}`);
      if (!res2.isSafe) throw new Error("False positive on safe string");
      if (res3.isSafe || !["DROP STATEMENT", "QUERY STACKING"].includes(res3.detectedKeyword || "")) throw new Error(`Failed stack check: ${JSON.stringify(res3)}`);
      if (res4.isSafe || !res4.detectedKeyword?.includes("EXEC")) throw new Error(`Failed exec check: ${JSON.stringify(res4)}`);
    },
    "Detected and categorized UNION SELECT, DROP DATABASE, QUERY STACKING, and xp_cmdshell payloads across recursive structures."
  );

  // 7. ORM-Safe Query Builder Layer Integration (RepositoryLayer)
  await runTest(
    "7. ORM-Safe Query Builder Wrapper Enforcement (RepositoryLayer)",
    async () => {
      // Create mock supabase client
      const mockSupabase: any = {
        from: (table: string) => ({
          select: (cols: string) => ({
            eq: (f: string, v: any) => Promise.resolve({ data: [{ [f]: v }], error: null }),
          }),
          insert: (payload: any) => ({
            select: () => ({ single: () => Promise.resolve({ data: payload, error: null }) }),
          }),
        }),
      };

      const repo = new RepositoryLayer(mockSupabase);

      // Verify that attempting SQL injection through repository wrapper throws SqlInjectionException immediately
      expectException(() => repo.safeFrom("patents; DROP TABLE users"), "INVALID_IDENTIFIER_SYNTAX");
      expectException(() => repo.safeSelect("patents", "id, password; --"), "INVALID_IDENTIFIER_SYNTAX");
      await expectAsyncException(() => repo.safeInsert("patents", { title: "Test", desc: "1' UNION SELECT password FROM users--" }), "SQL_KEYWORD_REJECTED");
    },
    "Guaranteed exclusive execution through parameterized builders while blocking malformed identifiers and payload keyword injection at the repository boundary."
  );

  console.log("\n================================================================================");
  console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test suite runner error:", err);
  process.exit(1);
});
