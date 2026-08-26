import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccessReviewService } from "@/lib/security/access/AccessReviewService";
import { withSessionValidation } from "@/lib/security";
import { GlobalExceptionHandler } from "@/lib/errors";

export const GET = withSessionValidation(async (req: NextRequest, sessionUser: any) => {
  try {
    const supabase = createAdminClient();

    // Fresh role from the DB, not the JWT claim — a demoted admin's existing
    // token can still say "admin" until it expires.
    const { data: userRecord } = await supabase
      .from("users")
      .select("role")
      .eq("id", sessionUser.sub)
      .single();
    const normalizedRole = (userRecord?.role || sessionUser.role)?.toLowerCase();
    if (!normalizedRole || !["admin", "super admin", "system admin"].includes(normalizedRole)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const now = new Date();

    // 1. Fetch Users
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, role_id");
    
    // 2. Fetch Roles
    const { data: roles, error: rolesErr } = await supabase
      .from("roles")
      .select("id, role_name");

    // 3. Fetch Audit Logs
    // Just fetch the last 1000 to process in memory to keep it simple,
    // or limit for performance.
    const { data: auditLogs, error: auditErr } = await supabase
      .from("audit_logs")
      .select("event_type, user_id, actor_id, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(1000);

    const safeUsers = users || [];
    const safeRoles = roles || [];
    const safeLogs = auditLogs || [];

    // --- Compute KPIs ---
    const activeUsersCount = safeUsers.length;
    const auditEventsCount = safeLogs.length; 
    const permissionDriftCount = safeLogs.filter(l => l.event_type?.includes("PERMISSION") || l.event_type?.includes("ROLE")).length;

    const accessService = new AccessReviewService(supabase);
    const accessStats = await accessService.getDashboardStats().catch(() => ({ adminUsers: 0, highRiskUsers: 0 }));
    const privilegedUsersCount = accessStats.adminUsers;
    const riskCount = accessStats.highRiskUsers;

    // --- Compute Role Distribution ---
    const roleCountMap: Record<string, number> = {};
    safeUsers.forEach(u => {
      if (u.role_id) {
        roleCountMap[u.role_id] = (roleCountMap[u.role_id] || 0) + 1;
      }
    });

    const roleDistribution = safeRoles.map(r => ({
      name: r.role_name,
      value: roleCountMap[r.id] || 0
    })).filter(r => r.value > 0);

    // If no roles match, provide a fallback just so the chart isn't empty if we want to show empty state
    // But empty state is also fine for real data.

    // --- Compute Recent Security Events ---
    // Try to get actual security events from SecurityEvents table if possible, or filter audit_logs
    const recentSecurityEvents = safeLogs
      .filter(log => log.event_type?.includes("FAILED") || log.event_type?.includes("LOCKED") || log.event_type?.includes("BLOCKED") || log.event_type?.includes("EXCEPTION") || log.event_type?.includes("VIOLATION"))
      .slice(0, 5)
      .map(log => {
      let severity = "High";
      if (log.event_type?.includes("LOCKED") || log.event_type?.includes("VIOLATION") || log.event_type?.includes("CRITICAL")) {
        severity = "Critical";
      }

      const logDate = new Date(log.created_at);
      const diffMin = Math.max(0, Math.round((now.getTime() - logDate.getTime()) / 60000));
      let timeStr = `${diffMin}m ago`;
      if (diffMin > 60) {
        timeStr = `${Math.round(diffMin / 60)}h ago`;
      }
      if (diffMin > 1440) {
        timeStr = `${Math.round(diffMin / 1440)}d ago`;
      }

      // Resolve user name or email
      let userDisplay = "System";
      const uId = log.user_id || log.actor_id;
      if (uId) {
         const usr = safeUsers.find(u => u.id === uId);
         if (usr) userDisplay = uId; // We don't fetch names in this optimized query, fallback to ID or metadata
      }
      if (log.metadata && log.metadata.email) {
         userDisplay = log.metadata.email;
      } else if (userDisplay === uId) {
         userDisplay = `User ${uId.substring(0,6)}`;
      }

      return {
        event: log.event_type,
        user: userDisplay,
        severity,
        time: timeStr
      };
    });
    
    // Fallback if no security events
    if (recentSecurityEvents.length === 0) {
        recentSecurityEvents.push({
            event: "SYSTEM_SECURE",
            user: "System",
            severity: "Info",
            time: "Just now"
        });
    }

    // --- User Activity (Logins/Searches over 30 days) ---
    // In a real app we'd aggregate by week. Let's just create 4 buckets for "W1, W2, W3, W4" based on the last 30 days.
    const w1Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const w2Start = new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000);
    const w3Start = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const w4Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userActivity = [
      { name: "W1", Logins: 0, Searches: 0 },
      { name: "W2", Logins: 0, Searches: 0 },
      { name: "W3", Logins: 0, Searches: 0 },
      { name: "W4", Logins: 0, Searches: 0 },
    ];

    safeLogs.forEach(log => {
      const d = new Date(log.created_at);
      let bucket = -1;
      if (d >= w4Start) bucket = 3;
      else if (d >= w3Start) bucket = 2;
      else if (d >= w2Start) bucket = 1;
      else if (d >= w1Start) bucket = 0;

      if (bucket !== -1) {
        if (log.event_type?.toLowerCase().includes("login")) {
          userActivity[bucket].Logins++;
        }
        if (log.event_type?.toLowerCase().includes("search") || log.event_type?.toLowerCase().includes("document")) {
          userActivity[bucket].Searches++;
        }
      }
    });

    // --- Audit Events (Daily) ---
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyEventsMap: Record<string, number> = {
      Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
    };
    
    // Only count last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    safeLogs.forEach(log => {
      const d = new Date(log.created_at);
      if (d >= sevenDaysAgo) {
        const dayName = days[d.getDay()];
        dailyEventsMap[dayName]++;
      }
    });

    // Order the daily events to start from 6 days ago up to today
    const auditEventsDaily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = days[d.getDay()];
      auditEventsDaily.push({
        name: dayName,
        value: dailyEventsMap[dayName]
      });
    }

    // --- AI Insights ---
    const insights = [];
    const todayLogs = safeLogs.filter(l => new Date(l.created_at).getTime() > (now.getTime() - 24 * 60 * 60 * 1000));
    
    const failedLogins = todayLogs.filter(l => l.event_type === "LOGIN_FAILED").length;
    if (failedLogins > 0) {
        insights.push({
            id: "insight_auth",
            type: failedLogins > 5 ? "warning" : "info",
            title: "Authentication Alert",
            description: `${failedLogins} failed login attempts detected in the last 24 hours.`,
            actionLabel: "View Logs",
            actionHref: "/dashboard/admin/audit-logs?action=LOGIN_FAILED"
        });
    }

    const lockedAccounts = todayLogs.filter(l => l.event_type === "ACCOUNT_LOCKED").length;
    if (lockedAccounts > 0) {
        insights.push({
            id: "insight_locked",
            type: "danger",
            title: "Account Lockouts",
            description: `${lockedAccounts} accounts were locked due to brute force protection.`,
            actionLabel: "Manage Users",
            actionHref: "/dashboard/settings/users"
        });
    }
    
    const permissionChanges = todayLogs.filter(l => l.event_type?.includes("ROLE") || l.event_type?.includes("PERMISSION")).length;
    if (permissionChanges > 0) {
        insights.push({
            id: "insight_perm",
            type: "info",
            title: "Permission Changes",
            description: `${permissionChanges} role or permission modification events detected today.`,
            actionLabel: "View Audit",
            actionHref: "/dashboard/admin/audit-logs"
        });
    }

    if (insights.length === 0) {
        insights.push({
            id: "insight_ok",
            type: "success",
            title: "System Secure",
            description: "No critical security issues or anomalies detected. System operating normally.",
        });
    }

    // --- System Health ---
    // Calculate simple health based on API success (if we reached here, DB is alive)
    // Could aggregate "EXCEPTION" audit events to lower the score.
    const exceptionCount = safeLogs.filter(l => l.event_type?.includes("EXCEPTION") || l.event_type?.includes("ERROR")).length;
    let systemHealth = 100.0;
    if (exceptionCount > 0) {
       systemHealth = Math.max(0, 100.0 - (exceptionCount * 0.5));
    }

    return NextResponse.json({
      data: {
        activeUsersCount,
        auditEventsCount,
        permissionDriftCount,
        privilegedUsersCount,
        riskCount,
        systemHealth,
        roleDistribution,
        recentSecurityEvents,
        userActivity,
        auditEventsDaily,
        insights
      }
    });

  } catch (err: any) {
    console.error("Admin Dashboard API Error:", err);
    return await GlobalExceptionHandler.handle(err);
  }
});
