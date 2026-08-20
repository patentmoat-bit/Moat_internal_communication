import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NotificationRouter } from '@/lib/notifications/server/NotificationRouter';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const getAdminSupabase = () => createClient(supabaseUrl, supabaseServiceKey);

export class EnterpriseWorkflowService {
  static async getTransitionRules(moduleType: string) {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase.from('workflow_transitions').select('*').eq('module_type', moduleType);
    if (error) throw new Error('Failed to fetch transition rules');
    return data;
  }

  static async validateTransition(moduleType: string, currentState: string, targetState: string, actorRole: string) {
    if (currentState === targetState) return true;
    const rules = await this.getTransitionRules(moduleType);
    const rule = rules.find(r => r.current_state === currentState && r.next_state === targetState);
    if (!rule) return false;
    if (!rule.allowed_roles.includes(actorRole) && !rule.allowed_roles.includes('Admin')) return false;
    return true;
  }

  static async getProject(moduleType: string, projectId: string) {
    const supabase = getAdminSupabase();
    let table = '';
    if (moduleType === 'PATENT') table = 'inventions';
    else if (moduleType === 'TRADEMARK') table = 'trademarks';
    else if (moduleType === 'COPYRIGHT') table = 'copyrights';
    else throw new Error('Invalid module type');

    const { data, error } = await supabase.from(table).select('*').eq('id', projectId).single();
    if (error || !data) throw new Error('Project not found');
    return data;
  }

  static async updateWorkflowStatus(payload: {
    moduleType: string;
    projectId: string;
    targetState: string;
    actorId: string;
    actorRole: string;
    description?: string;
    expectedCurrentState?: string; // For concurrency protection
  }) {
    const supabase = getAdminSupabase();
    const { moduleType, projectId, targetState, actorId, actorRole, description, expectedCurrentState } = payload;

    const project = await this.getProject(moduleType, projectId);
    const currentState = project.status;

    if (expectedCurrentState && currentState !== expectedCurrentState) {
      throw new Error(`CONFLICT: This project was updated by another user. Please refresh and review the latest state.`);
    }

    if (currentState === targetState) {
      return { success: true, project };
    }

    const isValid = await this.validateTransition(moduleType, currentState, targetState, actorRole);
    if (!isValid) {
      throw new Error('This workflow action is not available in the current project state or for your role.');
    }

    let table = '';
    if (moduleType === 'PATENT') table = 'inventions';
    else if (moduleType === 'TRADEMARK') table = 'trademarks';
    else if (moduleType === 'COPYRIGHT') table = 'copyrights';

    // Atomic update
    const { data: updatedProject, error: updateError } = await supabase
      .from(table)
      .update({ status: targetState, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('status', currentState) // Optimistic concurrency
      .select().single();

    if (updateError || !updatedProject) {
      throw new Error(`CONFLICT: Failed to update project state. It may have been modified concurrently.`);
    }

    // Log activity
    await this.logActivity({
      projectId,
      moduleType,
      entityType: 'PROJECT',
      entityId: projectId,
      actorId,
      actorRole,
      action: 'STATUS_CHANGED',
      description: description || `Status changed from ${currentState} to ${targetState}`,
      previousState: currentState,
      newState: targetState
    });

    const eventId = crypto.randomUUID();
    // Trigger notifications
    await NotificationRouter.routeEvent({
      eventId,
      projectId,
      projectName: project.name || project.product_name || project.title || 'Unknown Project',
      moduleType: moduleType as any,
      action: 'STATUS_CHANGED',
      actorId,
      actorRole,
      previousState: currentState,
      newState: targetState
    });

    return { success: true, project: updatedProject };
  }

  static async logActivity(payload: {
    projectId?: string;
    moduleType: string;
    entityType: string;
    entityId: string;
    actorId: string;
    actorRole: string;
    action: string;
    description?: string;
    previousState?: string;
    newState?: string;
    metadata?: any;
  }) {
    const supabase = getAdminSupabase();
    const { error } = await supabase.from('activity_events').insert({
      project_id: payload.projectId,
      module_type: payload.moduleType,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      actor_id: payload.actorId,
      actor_role: payload.actorRole,
      action: payload.action,
      description: payload.description,
      previous_state: payload.previousState,
      new_state: payload.newState,
      metadata: payload.metadata || {}
    });
    if (error) {
      console.error('Failed to log activity event:', error);
    }
  }

  static async getActivityTimeline(projectId: string) {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('activity_events')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch activity timeline');
    return data;
  }
}
