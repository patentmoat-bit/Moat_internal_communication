import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseWorkflowService } from '@/lib/workflow/server/WorkflowService';
import { verifyToken } from '@/lib/jwt';
import { NotificationRouter } from '@/lib/notifications/server/NotificationRouter';
import crypto from 'crypto';
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token) as { userId: string, role?: string } | null;
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const payload = await req.json();
    
    const eventId = crypto.randomUUID();
    
    // Phase 7 Optimization: Execute workflow logging and notifications in parallel
    await Promise.all([
      EnterpriseWorkflowService.logActivity({
        projectId: payload.projectId,
        moduleType: payload.moduleType,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actorId: decoded.userId,
        actorRole: decoded.role || 'User',
        action: payload.action,
        description: payload.description,
        previousState: payload.previousState,
        newState: payload.newState,
        metadata: payload.metadata
      }),
      NotificationRouter.routeEvent({
        eventId,
        projectId: payload.projectId || 'generic-project-id',
        projectName: payload.projectName || 'Unknown Project',
        moduleType: payload.moduleType as any,
        action: payload.action,
        actorId: decoded.userId,
        actorRole: decoded.role || 'User',
        previousState: payload.previousState,
        newState: payload.newState,
        metadata: payload.metadata
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
