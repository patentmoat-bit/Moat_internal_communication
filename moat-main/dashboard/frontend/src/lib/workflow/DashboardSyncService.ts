import crypto from "crypto";
import { DashboardSyncEvent } from "./types";

/**
 * DashboardSyncService
 * 
 * Enterprise real-time dashboard synchronization service for the MOAT Patent Intelligence Platform.
 * 1. Synchronizes workflow state changes and task assignments in real time across all role workspaces:
 *    CEO Dashboard -> Patent Analyst Dashboard -> Designer Dashboard -> Admin Dashboard.
 * 2. Manages role-specific and global event broadcast queues for UI polling and WebSockets.
 */
export class DashboardSyncService {
  private static syncEvents: DashboardSyncEvent[] = [];

  /**
   * Broadcast a real-time sync event across all dashboards or to a specific target dashboard.
   */
  static broadcastSyncEvent(
    eventType: string,
    workflowId: string,
    payload: any,
    targetDashboard: DashboardSyncEvent["targetDashboard"] = "ALL"
  ): DashboardSyncEvent {
    const event: DashboardSyncEvent = {
      id: `ev_sync_${crypto.randomUUID()}`,
      targetDashboard,
      eventType,
      workflowId,
      payload,
      timestamp: new Date().toISOString()
    };
    this.syncEvents.unshift(event);
    if (this.syncEvents.length > 2000) this.syncEvents.pop();
    return event;
  }

  /**
   * Retrieve pending sync events for a specific dashboard role.
   */
  static getSyncEvents(dashboardRole?: "CEO" | "Patent Analyst" | "Design Team" | "Admin" | "ALL"): DashboardSyncEvent[] {
    if (!dashboardRole || dashboardRole === "ALL") return [...this.syncEvents];

    return this.syncEvents.filter((e) => e.targetDashboard === "ALL" || e.targetDashboard === dashboardRole);
  }

  static clearRepository(): void {
    this.syncEvents = [];
  }
}
