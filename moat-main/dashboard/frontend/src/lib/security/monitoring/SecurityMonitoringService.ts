import { SupabaseClient } from "@supabase/supabase-js";
import { AlertEngine } from "./AlertEngine";
import { RiskAnalysisEngine } from "./RiskAnalysisEngine";
import { SystemMonitoringEvent } from "./types";

/**
 * MOAT Phase 8 — Central Security Monitoring Service
 * Implements Overall Workflow: System Event ➔ Security Monitoring Service ➔ Risk Analysis Engine ➔ Security Dashboard ➔ Alert Engine ➔ Admin Notification.
 */
export class SecurityMonitoringService {
  private static eventStream: SystemMonitoringEvent[] = [];
  private alertEngine: AlertEngine;

  constructor(private supabase?: SupabaseClient) {
    this.alertEngine = new AlertEngine(supabase);
    if (SecurityMonitoringService.eventStream.length === 0) {
      SecurityMonitoringService.seedMockEventStream();
    }
  }

  public static getEventStream(): SystemMonitoringEvent[] {
    return SecurityMonitoringService.eventStream;
  }

  /**
   * Process incoming system event through Risk Analysis and Alerting engines.
   */
  public async processEvent(event: SystemMonitoringEvent): Promise<SystemMonitoringEvent> {
    const timestamp = event.timestamp || new Date().toISOString();
    const eventId = event.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Risk Analysis Engine — Classify Severity
    const severity = RiskAnalysisEngine.classifyEvent(event);

    const enrichedEvent: SystemMonitoringEvent & { severity: string } = {
      ...event,
      eventId,
      timestamp,
      severity,
    };

    // Store in-memory stream for real-time dashboard visualization
    SecurityMonitoringService.eventStream.unshift(enrichedEvent);
    if (SecurityMonitoringService.eventStream.length > 2000) {
      SecurityMonitoringService.eventStream.pop();
    }

    // 2. Alert Engine — Generate alert if threshold or severity requires it
    if (RiskAnalysisEngine.requiresAlert(severity, event.eventType)) {
      await this.alertEngine.generateAlert({
        alertType: event.eventType,
        severity,
        title: `Security Event Alert: ${event.eventType.replace(/_/g, " ")}`,
        message: event.reason || `Detected high-risk event in category ${event.category} from IP ${event.ipAddress || "Unknown"}.`,
        source: `SecurityMonitoringService (${event.category})`,
        metadata: event.metadata,
      });
    }

    // 3. Database Persistence to SecurityEvents table
    if (this.supabase) {
      try {
        await this.supabase.from("SecurityEvents").insert({
          event_id: eventId,
          category: event.category,
          event_type: event.eventType,
          severity,
          user_id: event.userId || null,
          email: event.email || null,
          ip_address: event.ipAddress || "127.0.0.1",
          user_agent: event.userAgent || "Unknown",
          endpoint: event.endpoint || "/api/monitor",
          status: event.status || "INFO",
          reason: event.reason || null,
          metadata: event.metadata || {},
          created_at: timestamp,
        });
      } catch {
        // Fallback silently
      }
    }

    return enrichedEvent;
  }

  public getEvents(category?: string, severity?: string): SystemMonitoringEvent[] {
    let events = [...SecurityMonitoringService.eventStream];
    if (category) {
      events = events.filter((e) => e.category === category);
    }
    if (severity) {
      events = events.filter((e: any) => e.severity === severity);
    }
    return events;
  }

  private static seedMockEventStream(): void {
    const now = Date.now();
    const mockData: Array<SystemMonitoringEvent & { severity: string }> = [
      {
        eventId: "evt_seed_1",
        category: "AUTHENTICATION",
        eventType: "SUCCESSFUL_LOGIN",
        severity: "Low",
        userId: "usr_admin",
        email: "alex.turner@moat.ai",
        ipAddress: "192.168.1.104",
        status: "SUCCESS",
        reason: "Valid credential verification",
        timestamp: new Date(now - 5 * 60000).toISOString(),
      },
      {
        eventId: "evt_seed_2",
        category: "AUTHENTICATION",
        eventType: "MULTIPLE_LOGIN_FAILURES",
        severity: "High",
        userId: "usr_admin",
        email: "admin@moat.ai",
        ipAddress: "185.220.101.5",
        status: "FAILURE",
        reason: "5 consecutive failed login attempts",
        timestamp: new Date(now - 12 * 60000).toISOString(),
      },
      {
        eventId: "evt_seed_3",
        category: "API_SECURITY",
        eventType: "HTTP_403_FORBIDDEN",
        severity: "High",
        userId: null,
        email: null,
        ipAddress: "45.133.1.20",
        endpoint: "/api/admin/secrets/manage",
        status: "FAILURE",
        reason: "Missing admin role clearance",
        timestamp: new Date(now - 25 * 60000).toISOString(),
      },
      {
        eventId: "evt_seed_4",
        category: "WORKFLOW",
        eventType: "OVERDUE_TASK",
        severity: "Medium",
        userId: "usr_analyst_2",
        email: "sara.chen@moat.ai",
        status: "WARNING",
        reason: "Patent claims review overdue by 48 hours",
        timestamp: new Date(now - 40 * 60000).toISOString(),
      },
      {
        eventId: "evt_seed_5",
        category: "FILE_SECURITY",
        eventType: "OVERSIZED_FILE_UPLOAD",
        severity: "Medium",
        userId: "usr_analyst",
        email: "david.kim@moat.ai",
        ipAddress: "192.168.2.15",
        status: "FAILURE",
        reason: "File size 62MB exceeds 50MB search category limit",
        timestamp: new Date(now - 60 * 60000).toISOString(),
      },
      {
        eventId: "evt_seed_6",
        category: "EMAIL_NOTIFICATION",
        eventType: "EMAIL_SENT",
        severity: "Low",
        email: "sara.chen@moat.ai",
        status: "SUCCESS",
        reason: "Password reset instructions dispatched via MS Graph",
        timestamp: new Date(now - 90 * 60000).toISOString(),
      },
      {
        eventId: "evt_seed_7",
        category: "AUTHORIZATION",
        eventType: "PRIVILEGE_ESCALATION_ATTEMPT",
        severity: "Critical",
        userId: "usr_guest_9",
        email: "hacker@evil.org",
        ipAddress: "103.145.12.9",
        endpoint: "/api/users/updateRole",
        status: "FAILURE",
        reason: "Attempted role parameter injection: ['superadmin']",
        timestamp: new Date(now - 120 * 60000).toISOString(),
      },
    ];

    SecurityMonitoringService.eventStream = mockData;
  }
}
