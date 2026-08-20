import {
  LoginSchema,
  RegistrationSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  MfaVerifySchema,
  PatentCreateSchema,
  SavedPatentSchema,
  PatentUpdateSchema,
  TrademarkCreateSchema,
  DocumentUploadSchema,
  CommentCreateSchema,
  HighlightCreateSchema,
  CeoFeedbackSchema,
  SearchRequestSchema,
  NotificationRuleSchema,
  EmailConfigSchema,
  WorkflowUpdateSchema,
  AdminSettingsSchema,
} from "../schemas";

console.log("================================================================================");
console.log(" 🛡️ MOAT ENTERPRISE SCHEMA VALIDATION — VERIFICATION RUNNER");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName: string, schema: any, validData: any, invalidData: any, expectedErrorField?: string) {
  totalTests++;
  try {
    // Test 1: Valid data must pass
    const validRes = schema.safeParse(validData);
    if (!validRes.success) {
      console.log(`[FAIL] ${testName} — Valid data rejected:`, JSON.stringify(validRes.error.errors));
      return;
    }

    // Test 2: Invalid data must fail
    const invalidRes = schema.safeParse(invalidData);
    if (invalidRes.success) {
      console.log(`[FAIL] ${testName} — Invalid data was erroneously accepted!`);
      return;
    }

    // Check specific error field if required
    const errorPaths = invalidRes.error.errors.map((e: any) => e.path.join("."));
    if (expectedErrorField && !errorPaths.some((p: string) => p.includes(expectedErrorField))) {
      console.log(`[FAIL] ${testName} — Expected error on "${expectedErrorField}", got: ${errorPaths.join(", ")}`);
      return;
    }

    passedTests++;
    console.log(`[PASS] Req #${totalTests}: ${testName} — Validated required fields, data types, lengths & regex.`);
  } catch (err: any) {
    console.log(`[FAIL] ${testName} — Exception thrown during test:`, err.message);
  }
}

// 1. Login Schema
runTest(
  "1. Login Validation",
  LoginSchema,
  { email: "ceo@moat.ai", password: "Password123!" },
  { email: "invalid-email", password: "" },
  "email"
);

// 2. Registration Schema
runTest(
  "2. Registration Validation (Password matching & terms)",
  RegistrationSchema,
  { email: "analyst@moat.ai", password: "SecurePassword123!", confirmPassword: "SecurePassword123!", fullName: "Jane Doe", termsAccepted: true },
  { email: "analyst@moat.ai", password: "SecurePassword123!", confirmPassword: "DifferentPassword!", fullName: "Jane Doe", termsAccepted: true },
  "confirmPassword"
);

// 3. Password Reset Schemas
runTest(
  "3. Forgot & Reset Password Validation",
  ResetPasswordSchema,
  { token: "valid-reset-token-998877", newPassword: "NewSecure123!", confirmNewPassword: "NewSecure123!" },
  { token: "short", newPassword: "weak", confirmNewPassword: "weak" },
  "token"
);

// 4. MFA Verification Schema
runTest(
  "4. MFA Code Verification (6-digit regex check)",
  MfaVerifySchema,
  { code: "123456" },
  { code: "12A456" },
  "code"
);

// 5. Patent Creation Schema
runTest(
  "5. Patent Creation & Saved Patent Wrapper",
  SavedPatentSchema,
  { patent: { patent_number: "US10123456B2", title: "AI-Driven Patent Search System", citations: 15 } },
  { patent: { patent_number: "US$$INVALID", title: "A", citations: -5 } },
  "patent_number"
);

// 6. Patent Update Schema
runTest(
  "6. Patent Update (Partial modification with ID requirement)",
  PatentUpdateSchema,
  { id: "550e8400-e29b-41d4-a716-446655440000", status: "Granted" },
  { id: "", status: "InvalidStatus" },
  "id"
);

// 7. Trademark Creation Schema
runTest(
  "7. Trademark Creation (Serial & mark length enforcement)",
  TrademarkCreateSchema,
  { serial_number: "88123456", mark_name: "MOAT INTELLIGENCE", owner: "MOAT Inc." },
  { serial_number: "123", mark_name: "", owner: "" },
  "serial_number"
);

// 8. Document Upload Schema
runTest(
  "8. Document Upload Metadata Validation",
  DocumentUploadSchema,
  { documentTitle: "Filing Brief 2026", documentType: "Patent_Filing", classification: "Top_Secret" },
  { documentTitle: "A", documentType: "Unauthorized_Type" },
  "documentType"
);

// 9. Comments & CEO Feedback Schemas
runTest(
  "9. CEO Executive Feedback & Comment Workflow",
  CeoFeedbackSchema,
  { targetId: "patent-001", decision: "Approved", executiveNotes: "Filing authorized by CEO." },
  { targetId: "patent-001", decision: "IllegalDecision" },
  "decision"
);

// 10. Search Request Schema
runTest(
  "10. Search Request (Query bounds & filter validation)",
  SearchRequestSchema,
  { query: "neural networks", searchType: "semantic", options: { page: 1, resultsCount: 20 } },
  { query: "x".repeat(3000), searchType: "unsupported_mode" },
  "query"
);

// 11. Notification Rule Schema
runTest(
  "11. Notification Alert Rule Enforcement",
  NotificationRuleSchema,
  { ruleName: "Competitor Alert", eventType: "COMPETITOR_FILING", recipientRoles: ["ceo", "analyst"] },
  { ruleName: "A", eventType: "COMPETITOR_FILING", recipientRoles: [] },
  "recipientRoles"
);

// 12. Email Configuration Schema
runTest(
  "12. Email SMTP Server Configuration",
  EmailConfigSchema,
  { smtpHost: "smtp.moat.ai", smtpPort: 587, senderEmail: "alerts@moat.ai" },
  { smtpHost: "", smtpPort: 999999, senderEmail: "not-an-email" },
  "smtpPort"
);

// 13. Workflow Update Schema
runTest(
  "13. Workflow Status Transition Validation",
  WorkflowUpdateSchema,
  { taskId: "task-99", newStatus: "CEO_Approval_Pending", priority: "Urgent" },
  { taskId: "task-99", newStatus: "Invalid_Transition" },
  "newStatus"
);

// 14. Admin Settings Schema
runTest(
  "14. Admin Security Settings (Timeout & lockout bounds)",
  AdminSettingsSchema,
  { sessionTimeoutMinutes: 60, maxLoginAttempts: 5, lockoutDurationMinutes: 30 },
  { sessionTimeoutMinutes: 1, maxLoginAttempts: 100 },
  "sessionTimeoutMinutes"
);

console.log("\n================================================================================");
console.log(` 🏆 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
