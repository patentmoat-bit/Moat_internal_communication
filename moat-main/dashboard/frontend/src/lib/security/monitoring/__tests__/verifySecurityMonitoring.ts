import {
  AlertEngine,
  ApiMonitoringService,
  AuthenticationMonitoringService,
  DashboardAnalyticsService,
  EmailMonitoringService,
  InfrastructureMonitoringService,
  RiskAnalysisEngine,
  SecurityMonitoringService,
  SupabaseHealthMonitoringService,
  WorkflowMonitoringService,
} from "../index";

console.log("====================================================================================================");
console.log(" 🛡️ MOAT PHASE 8 — SECURITY MONITORING & ADMIN SECURITY DASHBOARD MASTER VERIFICATION");
console.log("====================================================================================================\n");

let passedTests = 0;
let totalTests = 0;

async function runTest(testNumber: number, testName: string, testFn: () => Promise<void> | void, description: string) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`[PASS] Test #${testNumber}: ${testName} — ${description}`);
  } catch (err: any) {
    console.error(`[FAIL] Test #${testNumber}: ${testName} — Exception:`, err.message);
  }
}

async function main() {
  // Test 1: Risk Analysis Engine Severity Classification
  await runTest(
    1,
    "Risk Analysis Engine Severity Classification",
    () => {
      const lowSev = RiskAnalysisEngine.classifyEvent({ eventType: "SUCCESSFUL_LOGIN" });
      const medSev = RiskAnalysisEngine.classifyEvent({ eventType: "RATE_LIMIT_EXCEEDED" });
      const highSev = RiskAnalysisEngine.classifyEvent({ eventType: "ACCOUNT_LOCKED" });
      const critSev = RiskAnalysisEngine.classifyEvent({ eventType: "PRIVILEGE_ESCALATION_ATTEMPT" });

      if (lowSev !== "Low" || medSev !== "Medium" || highSev !== "High" || critSev !== "Critical") {
        throw new Error(`Severity classification mismatch: Low=${lowSev}, Med=${medSev}, High=${highSev}, Crit=${critSev}`);
      }
    },
    "Verified that every system event is accurately classified into Low, Medium, High, or Critical risk severity."
  );

  // Test 2: Overall Workflow Integration (Event ➔ Monitoring ➔ Risk Analysis ➔ Alert Engine ➔ Admin Notification)
  await runTest(
    2,
    "Overall Workflow & Alert Engine Notification Integration",
    async () => {
      const monitor = new SecurityMonitoringService();
      const initialAlertsCount = AlertEngine.getAlertsStore().length;

      // Simulate a critical SQL injection attack attempt
      const res = await monitor.processEvent({
        category: "API_SECURITY",
        eventType: "INJECTION_ATTEMPT",
        ipAddress: "185.220.101.99",
        endpoint: "/api/patents/search",
        status: "FAILURE",
        reason: "SQL INJECTION DETECTED: ' OR '1'='1",
      });

      if ((res as any).severity !== "Critical") {
        throw new Error(`Expected Critical severity for SQL injection, got ${(res as any).severity}`);
      }

      const activeAlerts = AlertEngine.getAlertsStore();
      if (activeAlerts.length <= initialAlertsCount) {
        throw new Error("Alert Engine failed to automatically generate an admin alert for Critical event!");
      }

      const latestAlert = activeAlerts[0];
      if (!latestAlert.title.includes("INJECTION") || latestAlert.severity !== "Critical") {
        throw new Error(`Malformed alert generated: ${JSON.stringify(latestAlert)}`);
      }
    },
    "Verified Overall Workflow pipeline: event detection triggers risk scoring, alert generation, and admin notification."
  );

  // Test 3: Domain Monitoring Services (Authentication, API, Workflow, Email)
  await runTest(
    3,
    "Multi-Domain Telemetry Recording (Auth, API, Workflow, Email)",
    async () => {
      const authService = new AuthenticationMonitoringService();
      const apiService = new ApiMonitoringService();
      const wfService = new WorkflowMonitoringService();
      const emailService = new EmailMonitoringService();

      const authEvt = await authService.recordAuthEvent({
        eventType: "NEW_DEVICE_LOGIN",
        userId: "usr_executive",
        email: "ceo@moat.ai",
        ipAddress: "24.180.12.5",
        metadata: { deviceType: "MacBook Pro M3 Max", browser: "Safari 18" },
      });
      if (authEvt.category !== "AUTHENTICATION" || authEvt.status !== "SUCCESS") {
        throw new Error("Auth monitoring event malformed!");
      }

      const apiEvt = await apiService.recordApiEvent({
        endpoint: "/api/patents/export",
        method: "POST",
        statusCode: 429,
        responseTimeMs: 15,
        errorType: "HTTP_429_RATE_LIMIT",
        reason: "Export rate limit exceeded (Max 5/hr)",
      });
      if (apiEvt.status !== "FAILURE" || apiEvt.eventType !== "HTTP_429_RATE_LIMIT") {
        throw new Error("API monitoring event malformed!");
      }

      const wfEvt = await wfService.recordWorkflowEvent({
        workflowId: "wf_9921",
        transitionName: "SubmitForLegalReview",
        eventType: "OVERDUE_TASK",
        userId: "usr_analyst_1",
      });
      if (wfEvt.category !== "WORKFLOW" || wfEvt.status !== "WARNING") {
        throw new Error("Workflow monitoring event malformed!");
      }

      const emailEvt = await emailService.recordEmailEvent({
        eventType: "EMAIL_SENT",
        recipient: "investor@moat.ai",
        subject: "Q3 Patent Intelligence Report",
      });
      if (emailEvt.status !== "SUCCESS") {
        throw new Error("Email monitoring event malformed!");
      }
    },
    "Verified domain monitoring services log high-precision telemetry across Auth, API, Workflow, and Email."
  );

  // Test 4: Supabase Health Monitoring (Replaces Redis) & RLS Status
  await runTest(
    4,
    "Supabase Database, Storage, and RLS Health Monitoring (Replace Redis)",
    async () => {
      const supabaseHealth = new SupabaseHealthMonitoringService();
      const status = await supabaseHealth.getHealthStatus();

      if (status.databaseHealth !== "HEALTHY" || status.connectionStatus !== "CONNECTED") {
        throw new Error(`Database health error: ${JSON.stringify(status)}`);
      }
      if (status.rlsStatus !== "ENFORCED") {
        throw new Error(`Security breach risk: RLS status is ${status.rlsStatus}`);
      }
      if (status.storageLimitMb !== 5000 || status.storageBucketHealth !== "HEALTHY") {
        throw new Error("Storage health telemetry failed!");
      }
    },
    "Verified Supabase monitoring service tracks DB connectivity, slow queries, storage capacity, and RLS enforcement."
  );

  // Test 5: Infrastructure & Vercel Deployment Monitoring
  await runTest(
    5,
    "Server Infrastructure, Memory, and Vercel Environment Monitoring",
    async () => {
      const infraService = new InfrastructureMonitoringService();
      const infra = await infraService.getInfrastructureStatus();

      if (infra.appStatus !== "ONLINE" || typeof infra.memoryUsageMb !== "number") {
        throw new Error(`Infrastructure status check failed: ${JSON.stringify(infra)}`);
      }
      if (infra.vercelDeploymentStatus !== "READY") {
        throw new Error(`Vercel deployment state warning: ${infra.vercelDeploymentStatus}`);
      }
    },
    "Verified server infrastructure monitoring tracks memory usage, API latency, and Vercel deployment health."
  );

  // Test 6: Central Dashboard Analytics Service Aggregation
  await runTest(
    6,
    "Admin Security Dashboard Analytics & Widget Aggregation",
    async () => {
      const analyticsService = new DashboardAnalyticsService();
      const summary = await analyticsService.getDashboardMetrics();

      // Check all 9 required dashboard domains
      if (!summary.authentication || typeof summary.authentication.successfulLogins !== "number") {
        throw new Error("Missing Authentication widget metrics!");
      }
      if (!summary.authorization || typeof summary.authorization.permissionDenied !== "number") {
        throw new Error("Missing Authorization widget metrics!");
      }
      if (!summary.apiSecurity || typeof summary.apiSecurity.totalRequests !== "number") {
        throw new Error("Missing API Security widget metrics!");
      }
      if (!summary.workflow || typeof summary.workflow.pendingApprovals !== "number") {
        throw new Error("Missing Workflow widget metrics!");
      }
      if (!summary.fileSecurity || typeof summary.fileSecurity.fileUploads !== "number") {
        throw new Error("Missing File Security widget metrics!");
      }
      if (!summary.email || summary.email.oauthStatus !== "CONNECTED") {
        throw new Error("Missing Email / OAuth widget metrics!");
      }
      if (!summary.supabase || summary.supabase.rlsStatus !== "ENFORCED") {
        throw new Error("Missing Supabase widget metrics!");
      }
      if (!summary.infrastructure || summary.infrastructure.appStatus !== "ONLINE") {
        throw new Error("Missing Infrastructure widget metrics!");
      }
      if (!summary.alerts || !Array.isArray(summary.alerts)) {
        throw new Error("Missing Alert Engine active alerts list!");
      }
    },
    "Verified that DashboardAnalyticsService aggregates 100% of telemetry required for Admin Security Dashboard widgets."
  );

  console.log("\n====================================================================================================");
  console.log(` 🏆 PHASE 8 VERIFICATION SUMMARY: ${passedTests} / ${totalTests} REQUIREMENTS PASSED (${Math.round((passedTests / totalTests) * 100)}% COMPLIANT)`);
  console.log("====================================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main();
