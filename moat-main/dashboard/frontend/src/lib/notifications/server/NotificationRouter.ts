import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const getAdminSupabase = () => createClient(supabaseUrl, supabaseServiceKey);

export interface NotificationEvent {
  eventId: string;
  projectId: string;
  projectName: string;
  moduleType: 'PATENT' | 'TRADEMARK' | 'COPYRIGHT' | 'AI_HUB';
  action: string;
  actorId: string;
  actorRole: string;
  previousState?: string;
  newState?: string;
  metadata?: any;
}

export class NotificationRouter {
  static async routeEvent(event: NotificationEvent) {
    const supabase = getAdminSupabase();

    // 1. Idempotency Check
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('metadata->>event_id', event.eventId)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`Notification for event ${event.eventId} already processed. Skipping.`);
      return;
    }

    // 2. Determine Recipients and Templates based on Action and Module
    const recipients = this.determineRecipients(event);
    if (recipients.length === 0) return;

    const { title, description } = this.buildNotificationContent(event);

    // 3. Create Dashboard Notifications
    const notificationInserts = recipients.map(receiver => ({
      title,
      description,
      type: event.moduleType.toLowerCase(),
      priority: 'normal',
      created_by: event.actorId,
      receiver: receiver.id || receiver.role, // fallback to role if specific ID not known
      is_read: false,
      is_archived: false,
      metadata: { event_id: event.eventId, project_id: event.projectId, action: event.action }
    }));

    const { error: notifError } = await supabase.from('notifications').insert(notificationInserts);
    if (notifError) {
      console.error('Failed to create notifications:', notifError);
    }

    // 4. Background Email Delivery (Simulated Queue for Idempotency/Reliability)
    for (const recipient of recipients) {
      await this.queueEmail(event, recipient, title, description);
    }
  }

  private static determineRecipients(event: NotificationEvent): Array<{ role?: string; id?: string }> {
    const recipients: Array<{ role?: string; id?: string }> = [];

    // Basic Routing Rules
    if (event.action === 'PROJECT_CREATED' || event.action === 'STATUS_CHANGED') {
      if (event.actorRole === 'Patent Analyst' || event.actorRole === 'Analyst') {
        recipients.push({ role: 'CEO' });
      } else if (event.actorRole === 'CEO') {
        recipients.push({ role: 'Patent Analyst' });
      }
      // Always CC Admin
      recipients.push({ role: 'Admin' });
    }

    if (event.newState === 'Design Review') {
      recipients.push({ role: 'Design Team' });
      recipients.push({ role: 'Admin' });
    }

    if (event.newState === 'CEO Review' || event.newState === 'CEO Approval') {
      recipients.push({ role: 'CEO' });
    }

    // Remove duplicates
    const uniqueRoles = new Set<string>();
    return recipients.filter(r => {
      if (r.role && !uniqueRoles.has(r.role)) {
        uniqueRoles.add(r.role);
        return true;
      }
      return false;
    });
  }

  private static buildNotificationContent(event: NotificationEvent): { title: string, description: string } {
    const moduleName = event.moduleType.charAt(0).toUpperCase() + event.moduleType.slice(1).toLowerCase();
    let title = `New ${moduleName} Notification`;
    let description = `Event ${event.action} occurred on project ${event.projectName}.`;

    if (event.action === 'PROJECT_CREATED') {
      title = `New ${moduleName} Project Assigned`;
      description = `A new ${moduleName} project "${event.projectName}" has been created/assigned.`;
    } else if (event.action === 'STATUS_CHANGED') {
      title = `Project status updated`;
      description = `Project: ${event.projectName}\nStatus: ${event.previousState} → ${event.newState}\nChanged by: ${event.actorRole}`;
    } else if (event.action === 'DOCUMENT_UPLOADED') {
      title = `Document Uploaded`;
      description = `A new document was uploaded to ${moduleName} project "${event.projectName}" by ${event.actorRole}.`;
    }

    return { title, description };
  }

  private static async queueEmail(event: NotificationEvent, recipient: { role?: string; id?: string }, subject: string, body: string) {
    const supabase = getAdminSupabase();
    // Store in email_logs to be picked up by a background worker
    const { error } = await supabase.from('email_logs').insert({
      event_type: event.action,
      subject,
      recipients: { to: [recipient.role || recipient.id] },
      status: 'Pending',
    });
    if (error) {
      console.error('Failed to queue email:', error);
    }
  }
}
