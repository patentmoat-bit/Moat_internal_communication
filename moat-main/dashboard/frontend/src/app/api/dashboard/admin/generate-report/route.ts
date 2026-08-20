import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withSessionValidation } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const POST = withSessionValidation(async (req: NextRequest, sessionUser: any) => {
  try {
    const supabase = createAdminClient();

    // ── Role Guard ────────────────────────────────────────────────────────────
    const { data: userRecord } = await supabase
      .from("users")
      .select("roles(role_name)")
      .eq("id", sessionUser.sub)
      .single();

    const dbRole = Array.isArray(userRecord?.roles)
      ? userRecord?.roles[0]?.role_name
      : (userRecord?.roles as any)?.role_name;
    const rawRole = dbRole || sessionUser.role || "";
    const normRole = rawRole.toLowerCase().replace(/[\s_-]/g, "");
    if (!["admin", "superadmin", "systemadmin"].includes(normRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Parse filters ─────────────────────────────────────────────────────────
    let body: any = {};
    try { body = await req.json(); } catch {}
    const {
      dateFrom,
      dateTo,
      userFilter = "",
      roleFilter = "all",
      activityFilter = "all",
      projectFilter = "",
      searchText = "",
    } = body;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const start = dateFrom ? new Date(dateFrom) : startOfMonth;
    const end = dateTo ? new Date(dateTo + "T23:59:59.999Z") : now;
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // ── Parallel Queries ──────────────────────────────────────────────────────
    const [
      usersRes,
      auditRes,
      securityEventsRes,
      workflowRes,
      notificationsRes,
      emailLogsRes,
      documentsRes,
      downloadLogsRes,
      activityLogsRes,
    ] = await Promise.all([
      supabase.from("users").select("id, name, email, created_at, last_login, is_active, status, roles(role_name)"),
      supabase.from("audit_logs").select("*").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(2000),
      supabase.from("SecurityEvents").select("*").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(1000).then(r => r).catch(() => ({ data: [] })),
      supabase.from("workflow_history").select("*").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(1000),
      supabase.from("notifications").select("*").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(500),
      supabase.from("email_logs").select("*").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(500).then(r => r).catch(() => ({ data: [] })),
      supabase.from("patent_documents").select("id, title, document_name, created_at, uploaded_by, user_id, status, file_size, file_type, project_id").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(500),
      supabase.from("design_download_logs").select("*").gte("created_at", startISO).lte("created_at", endISO).limit(500).then(r => r).catch(() => ({ data: [] })),
      supabase.from("activity_logs").select("*").gte("created_at", startISO).lte("created_at", endISO).order("created_at", { ascending: false }).limit(1000).then(r => r).catch(() => ({ data: [] })),
    ]);

    // ── Build user map ────────────────────────────────────────────────────────
    const allUsers = (usersRes.data || []).map((u: any) => ({
      id: u.id,
      name: u.name || u.email || "Unknown",
      email: u.email || "",
      role: Array.isArray(u.roles) ? u.roles[0]?.role_name : (u.roles as any)?.role_name || "Unknown",
      lastLogin: u.last_login,
      created: u.created_at,
      isActive: u.is_active,
      status: u.status || "Active",
    }));

    const userMap: Record<string, any> = {};
    allUsers.forEach((u: any) => { userMap[u.id] = u; });

    // ── Filter helpers ────────────────────────────────────────────────────────
    let filteredUserIds: string[] | null = null;
    if (roleFilter && roleFilter !== "all") {
      filteredUserIds = allUsers.filter((u: any) => u.role === roleFilter).map((u: any) => u.id);
    }
    if (userFilter && userFilter.trim()) {
      const match = allUsers.find((u: any) =>
        u.email?.toLowerCase().includes(userFilter.trim().toLowerCase()) ||
        u.name?.toLowerCase().includes(userFilter.trim().toLowerCase())
      );
      filteredUserIds = match ? [match.id] : [];
    }

    // ── Audit logs ────────────────────────────────────────────────────────────
    let auditLogs = (auditRes.data || []);
    if (filteredUserIds !== null) {
      auditLogs = auditLogs.filter((l: any) => filteredUserIds!.includes(l.user_id));
    }

    // ── Security Events ───────────────────────────────────────────────────────
    let secEvents = ((securityEventsRes as any).data || []);

    // ── Workflow ──────────────────────────────────────────────────────────────
    let workflowLogs = (workflowRes.data || []);

    // ── Notifications ─────────────────────────────────────────────────────────
    let notifications = (notificationsRes.data || []);

    // ── Email logs ────────────────────────────────────────────────────────────
    let emailLogs = ((emailLogsRes as any).data || []);

    // ── Documents ─────────────────────────────────────────────────────────────
    let documents = (documentsRes.data || []);
    if (filteredUserIds !== null) {
      documents = documents.filter((d: any) => filteredUserIds!.includes(d.uploaded_by || d.user_id));
    }

    // ── Activity logs ─────────────────────────────────────────────────────────
    let activityLogs = ((activityLogsRes as any).data || []);
    if (filteredUserIds !== null) {
      activityLogs = activityLogs.filter((l: any) => filteredUserIds!.includes(l.user_id));
    }

    // ── Download logs ──────────────────────────────────────────────────────────
    let downloadLogs = ((downloadLogsRes as any).data || []);

    // ── Derive action status ──────────────────────────────────────────────────
    const getStatus = (action: string) => {
      if (!action) return "INFO";
      const a = action.toUpperCase();
      if (a.includes("FAILED") || a.includes("LOCKED") || a.includes("BLOCKED") || a.includes("DENIED")) return "FAILED";
      if (a.includes("REJECTED") || a.includes("WARN")) return "WARNING";
      if (a === "LOGIN_SUCCESS" || a.includes("APPROVED") || a === "MFA_VERIFIED" || a.includes("SUCCESS")) return "SUCCESS";
      return "INFO";
    };

    const getDetail = (l: any) => {
      const nv = l.new_value || {};
      const ov = l.old_value || {};
      if (l.action === "LOGIN_SUCCESS") return `Logged in from ${l.ip || "N/A"}`;
      if (l.action === "LOGIN_FAILED") return `Login failed — ${nv.reason || "Invalid credentials"} — IP: ${l.ip || "N/A"}`;
      if (l.action === "DOCUMENT_UPLOADED") return `Uploaded: "${nv.documentName || nv.title || "Document"}"`;
      if (l.action === "DOCUMENT_DOWNLOADED") return `Downloaded: "${nv.documentName || nv.title || "Document"}"`;
      if (l.action === "DOCUMENT_SHARED") return `Shared "${nv.documentName || "Document"}" with ${nv.sharedWith || "user"}`;
      if (l.action === "PATENT_ASSIGNED") return `Patent assigned to ${nv.assignedTo || "user"}`;
      if (l.action === "PATENT_APPROVED") return `Approved: "${nv.patentTitle || nv.title || "Patent"}"`;
      if (l.action === "PATENT_REJECTED") return `Rejected: "${nv.patentTitle || nv.title || "Patent"}"`;
      if (l.action === "PATENT_STATUS_CHANGED") return `Status: ${ov.status || "?"} → ${nv.status || "?"}`;
      if (l.action === "MFA_VERIFIED") return "MFA verification successful";
      if (l.action === "MFA_FAILED") return "MFA verification failed";
      if (l.action?.includes("SEARCH")) return `Searched: "${nv.query || "N/A"}"`;
      if (l.action === "ROLE_CHANGED" || l.action === "ROLE_ASSIGNED") return `Role → ${nv.role_name || nv.role || "?"}`;
      if (l.action === "USER_CREATED") return `New user: ${nv.email || nv.name || "Unknown"}`;
      if (l.action === "REPORT_GENERATED") return `Report generated (${nv.reportType || "enterprise"})`;
      if (nv.description) return nv.description;
      return nv.reason || l.action || "";
    };

    // ── Build unified activity timeline ───────────────────────────────────────
    const timelineItems: any[] = [];

    // From audit logs
    auditLogs.forEach((l: any) => {
      const actor = userMap[l.user_id] || {};
      timelineItems.push({
        timestamp: l.timestamp || l.created_at,
        user: actor.name || l.new_value?.email || l.user_id || "Unknown",
        email: actor.email || l.new_value?.email || "",
        role: actor.role || "Unknown",
        action: l.action || "UNKNOWN",
        activityType: (() => {
          const a = (l.action || "").toUpperCase();
          if (a.includes("LOGIN") || a.includes("LOGOUT") || a.includes("MFA") || a.includes("SESSION") || a.includes("PASSWORD")) return "Security";
          if (a.includes("DOCUMENT") || a.includes("UPLOAD") || a.includes("DOWNLOAD")) return "Document";
          if (a.includes("PATENT") || a.includes("SEARCH")) return "Patent";
          if (a.includes("WORKFLOW") || a.includes("APPROVED") || a.includes("REJECTED") || a.includes("ASSIGNED")) return "Workflow";
          if (a.includes("USER") || a.includes("ROLE") || a.includes("PERMISSION")) return "Admin";
          if (a.includes("REPORT")) return "Report";
          return "System";
        })(),
        detail: getDetail(l),
        status: getStatus(l.action),
        ip: l.ip || "N/A",
        module: l.module || "SYSTEM",
        source: "audit",
      });
    });

    // From workflow history
    workflowLogs.forEach((w: any) => {
      const actor = userMap[w.changed_by] || {};
      timelineItems.push({
        timestamp: w.created_at,
        user: actor.name || w.changed_by || "System",
        email: actor.email || "",
        role: actor.role || "Unknown",
        action: "WORKFLOW_TRANSITION",
        activityType: "Workflow",
        detail: `${w.resource_type || "Project"}: ${w.from_status || "?"} → ${w.to_status || "?"} ${w.comment ? `| ${w.comment}` : ""}`,
        status: w.to_status?.toLowerCase().includes("approved") ? "SUCCESS" : w.to_status?.toLowerCase().includes("reject") ? "FAILED" : "INFO",
        ip: "N/A",
        module: "WORKFLOW",
        source: "workflow",
        project: w.resource_id || "",
        fromStatus: w.from_status,
        toStatus: w.to_status,
        comment: w.comment,
      });
    });

    // From activity logs
    activityLogs.forEach((l: any) => {
      const actor = userMap[l.user_id] || {};
      if (!auditLogs.find((a: any) => a.id === l.id)) {
        timelineItems.push({
          timestamp: l.created_at,
          user: actor.name || l.user_id || "Unknown",
          email: actor.email || "",
          role: actor.role || "Unknown",
          action: l.action || l.activity_type || "ACTIVITY",
          activityType: l.category || "System",
          detail: l.description || l.details || "",
          status: "INFO",
          ip: "N/A",
          module: l.module || "SYSTEM",
          source: "activity",
        });
      }
    });

    // From download logs
    downloadLogs.forEach((l: any) => {
      const actor = userMap[l.user_id || l.designer_id] || {};
      timelineItems.push({
        timestamp: l.created_at,
        user: actor.name || "Unknown",
        email: actor.email || "",
        role: actor.role || "Unknown",
        action: "DOCUMENT_DOWNLOADED",
        activityType: "Document",
        detail: `Downloaded: "${l.document_name || l.file_name || "Document"}"`,
        status: "SUCCESS",
        ip: "N/A",
        module: "DOCUMENTS",
        source: "download",
      });
    });

    // From security events table
    secEvents.forEach((e: any) => {
      const actor = userMap[e.user_id] || {};
      timelineItems.push({
        timestamp: e.created_at,
        user: actor.name || e.user_id || "Unknown",
        email: actor.email || e.email || "",
        role: actor.role || "Unknown",
        action: e.event_type || e.action || "SECURITY_EVENT",
        activityType: "Security",
        detail: e.details || e.reason || e.description || "",
        status: getStatus(e.event_type || e.action || ""),
        ip: e.ip_address || "N/A",
        module: "SECURITY",
        source: "security",
        riskLevel: e.risk_level || e.severity || "INFO",
      });
    });

    // Sort timeline by timestamp desc
    timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // ── Apply search text filter ───────────────────────────────────────────────
    let finalTimeline = timelineItems;
    if (searchText && searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      finalTimeline = timelineItems.filter(t =>
        t.user?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.action?.toLowerCase().includes(q) ||
        t.detail?.toLowerCase().includes(q) ||
        t.role?.toLowerCase().includes(q) ||
        t.activityType?.toLowerCase().includes(q)
      );
    }

    // Apply activity type filter
    if (activityFilter && activityFilter !== "all") {
      finalTimeline = finalTimeline.filter(t => t.activityType?.toLowerCase() === activityFilter.toLowerCase());
    }

    // ── Per-user stats ────────────────────────────────────────────────────────
    const userStats: Record<string, any> = {};
    allUsers.forEach((u: any) => {
      userStats[u.id] = {
        ...u,
        logins: 0, failedLogins: 0, mfaSuccess: 0, mfaFailed: 0,
        docsUploaded: 0, docsDownloaded: 0, docsShared: 0, docsViewed: 0,
        patentSearches: 0, workflowActions: 0, approvals: 0, rejections: 0,
        securityEvents: 0, notifications: 0, lastActivity: null,
      };
    });

    auditLogs.forEach((l: any) => {
      const s = userStats[l.user_id];
      if (!s) return;
      const a = (l.action || "").toUpperCase();
      if (a === "LOGIN_SUCCESS") s.logins++;
      else if (a === "LOGIN_FAILED") s.failedLogins++;
      else if (a === "MFA_VERIFIED") s.mfaSuccess++;
      else if (a === "MFA_FAILED") s.mfaFailed++;
      else if (a === "DOCUMENT_UPLOADED") s.docsUploaded++;
      else if (a === "DOCUMENT_DOWNLOADED") s.docsDownloaded++;
      else if (a === "DOCUMENT_SHARED") s.docsShared++;
      else if (a === "DOCUMENT_VIEWED") s.docsViewed++;
      else if (a.includes("SEARCH")) s.patentSearches++;
      else if (["PATENT_APPROVED","PATENT_REJECTED","PATENT_STATUS_CHANGED","PATENT_ASSIGNED"].includes(a)) s.workflowActions++;
      if (a === "PATENT_APPROVED") s.approvals++;
      if (a === "PATENT_REJECTED") s.rejections++;
      if (["LOGIN_FAILED","MFA_FAILED","MFA_LOCKED","ACCOUNT_LOCKED","RATE_LIMIT_EXCEEDED"].includes(a)) s.securityEvents++;

      const ts = l.timestamp || l.created_at;
      if (!s.lastActivity || new Date(ts) > new Date(s.lastActivity)) s.lastActivity = ts;
    });

    workflowLogs.forEach((w: any) => {
      const s = userStats[w.changed_by];
      if (!s) return;
      s.workflowActions++;
      const ts = w.created_at;
      if (w.to_status?.toLowerCase().includes("approved")) s.approvals++;
      if (w.to_status?.toLowerCase().includes("reject")) s.rejections++;
      if (!s.lastActivity || new Date(ts) > new Date(s.lastActivity)) s.lastActivity = ts;
    });

    notifications.forEach((n: any) => {
      const s = userStats[n.receiver];
      if (s) s.notifications++;
    });

    documents.forEach((d: any) => {
      const s = userStats[d.uploaded_by || d.user_id];
      if (s) s.docsUploaded++;
    });

    downloadLogs.forEach((l: any) => {
      const s = userStats[l.user_id || l.designer_id];
      if (s) s.docsDownloaded++;
    });

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const totalAudit = auditLogs;
    const kpis = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u: any) => u.isActive !== false && u.status !== "DISABLED" && u.status !== "Inactive").length,
      totalLogins: totalAudit.filter((l: any) => l.action === "LOGIN_SUCCESS").length,
      failedLogins: totalAudit.filter((l: any) => l.action === "LOGIN_FAILED").length,
      mfaSuccess: totalAudit.filter((l: any) => l.action === "MFA_VERIFIED").length,
      mfaFailed: totalAudit.filter((l: any) => ["MFA_FAILED","MFA_LOCKED"].includes(l.action)).length,
      lockedAccounts: totalAudit.filter((l: any) => l.action === "ACCOUNT_LOCKED").length,
      docsUploaded: totalAudit.filter((l: any) => l.action === "DOCUMENT_UPLOADED").length + documents.length,
      docsDownloaded: totalAudit.filter((l: any) => l.action === "DOCUMENT_DOWNLOADED").length + downloadLogs.length,
      docsShared: totalAudit.filter((l: any) => l.action === "DOCUMENT_SHARED").length,
      docsViewed: totalAudit.filter((l: any) => l.action === "DOCUMENT_VIEWED").length,
      patentSearches: totalAudit.filter((l: any) => (l.action || "").includes("SEARCH")).length,
      workflowActions: workflowLogs.length,
      approvals: workflowLogs.filter((w: any) => w.to_status?.toLowerCase().includes("approved")).length +
                 totalAudit.filter((l: any) => l.action === "PATENT_APPROVED").length,
      rejections: workflowLogs.filter((w: any) => w.to_status?.toLowerCase().includes("reject")).length +
                  totalAudit.filter((l: any) => l.action === "PATENT_REJECTED").length,
      notificationsSent: notifications.length,
      emailsSent: emailLogs.length,
      securityEvents: totalAudit.filter((l: any) => ["LOGIN_FAILED","MFA_FAILED","MFA_LOCKED","RATE_LIMIT_EXCEEDED","ACCOUNT_LOCKED","BRUTE_FORCE_DETECTED","CREDENTIAL_STUFFING_DETECTED"].includes(l.action)).length + secEvents.length,
    };

    // ── Role-based breakdown ──────────────────────────────────────────────────
    const roleBreakdown: Record<string, any> = {};
    allUsers.forEach((u: any) => {
      if (!roleBreakdown[u.role]) roleBreakdown[u.role] = { count: 0, logins: 0, docs: 0, searches: 0, workflow: 0, security: 0 };
      const rb = roleBreakdown[u.role];
      const us = userStats[u.id];
      rb.count++;
      rb.logins += us?.logins || 0;
      rb.docs += (us?.docsUploaded || 0) + (us?.docsDownloaded || 0);
      rb.searches += us?.patentSearches || 0;
      rb.workflow += us?.workflowActions || 0;
      rb.security += us?.securityEvents || 0;
    });

    // ── Observations ──────────────────────────────────────────────────────────
    const observations: string[] = [];
    const sortedUsers = Object.values(userStats).sort((a: any, b: any) => (b.logins + b.docsUploaded + b.patentSearches) - (a.logins + a.docsUploaded + a.patentSearches));
    if (sortedUsers[0]) observations.push(`Most active user: ${(sortedUsers[0] as any).name} (${(sortedUsers[0] as any).role}) with ${(sortedUsers[0] as any).logins} logins and ${(sortedUsers[0] as any).patentSearches} patent searches.`);
    const topRole = Object.entries(roleBreakdown).sort((a: any, b: any) => (b[1].logins + b[1].docs) - (a[1].logins + a[1].docs))[0];
    if (topRole) observations.push(`Most active role: ${topRole[0]} with ${topRole[1].logins} logins and ${topRole[1].docs} document interactions.`);
    if (kpis.failedLogins > 0) observations.push(`${kpis.failedLogins} failed login attempt(s) recorded — review for suspicious activity.`);
    if (kpis.mfaFailed > 0) observations.push(`${kpis.mfaFailed} MFA failure(s) recorded during the period.`);
    if (kpis.docsUploaded > 0) observations.push(`${kpis.docsUploaded} document(s) were uploaded across all roles.`);
    if (kpis.workflowActions > 0) observations.push(`${kpis.workflowActions} workflow transitions recorded across projects.`);
    if (kpis.securityEvents > 5) observations.push(`Elevated security event count (${kpis.securityEvents}) — security review recommended.`);

    // ── Dynamic executive summary ──────────────────────────────────────────────
    const roleNames = Object.keys(roleBreakdown).filter(r => r !== "Unknown").join(", ");
    const executiveSummary = `During this reporting period (${start.toLocaleDateString()} – ${end.toLocaleDateString()}), ${kpis.totalUsers} users accessed the MOAT Patent Intelligence Platform across roles: ${roleNames || "multiple roles"}. The platform recorded ${kpis.totalLogins} successful login(s), ${kpis.failedLogins} failed login attempt(s), ${kpis.docsUploaded} document upload(s), ${kpis.patentSearches} patent search(es), and ${kpis.workflowActions} workflow action(s). ${kpis.securityEvents > 0 ? `${kpis.securityEvents} security event(s) were also recorded and require attention.` : "No critical security events were detected."}`;

    // ── Log this report generation ─────────────────────────────────────────────
    supabase.from("audit_logs").insert({
      user_id: sessionUser.sub,
      action: "REPORT_GENERATED",
      module: "ENTERPRISE_REPORT",
      new_value: { email: sessionUser.email, filters: { dateFrom, dateTo, roleFilter, activityFilter } },
    }).then(() => {});

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      generatedBy: sessionUser.email || "Admin",
      period: { from: startISO, to: endISO },
      executiveSummary,
      observations,
      kpis,
      roleBreakdown,
      userList: Object.values(userStats),
      timeline: finalTimeline.slice(0, 1000),
      totalTimelineEvents: finalTimeline.length,
      workflowTimeline: workflowLogs.map((w: any) => ({
        timestamp: w.created_at,
        project: w.resource_id || w.project_id || "N/A",
        resourceType: w.resource_type || "Patent",
        fromStatus: w.from_status || "N/A",
        toStatus: w.to_status || "N/A",
        changedBy: userMap[w.changed_by]?.name || w.changed_by || "System",
        changedByRole: userMap[w.changed_by]?.role || "Unknown",
        comment: w.comment || "",
      })),
      documentList: documents.slice(0, 500).map((d: any) => ({
        id: d.id,
        title: d.title || d.document_name || "Untitled",
        type: d.file_type || "Document",
        uploadedBy: userMap[d.uploaded_by || d.user_id]?.name || d.uploaded_by || "Unknown",
        uploadedByRole: userMap[d.uploaded_by || d.user_id]?.role || "Unknown",
        uploadedByEmail: userMap[d.uploaded_by || d.user_id]?.email || "",
        createdAt: d.created_at,
        status: d.status || "Active",
        size: d.file_size,
        project: d.project_id || "N/A",
      })),
      notificationList: notifications.slice(0, 200).map((n: any) => ({
        timestamp: n.created_at,
        type: n.type || n.notification_type || "Notification",
        message: n.message || n.body || n.title || "",
        receiver: userMap[n.receiver]?.email || n.receiver || "Unknown",
        receiverRole: userMap[n.receiver]?.role || "Unknown",
        isRead: n.is_read,
        status: n.status || "Sent",
      })),
      emailList: emailLogs.slice(0, 200).map((e: any) => ({
        timestamp: e.created_at,
        to: e.to || e.recipient || "",
        subject: e.subject || "",
        type: e.type || e.template || "Email",
        status: e.status || "Sent",
        error: e.error || "",
      })),
    });

  } catch (err: any) {
    console.error("[enterprise-report] Error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error", detail: err?.message }, { status: 500 });
  }
});
