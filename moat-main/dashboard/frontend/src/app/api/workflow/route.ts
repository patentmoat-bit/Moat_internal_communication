import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseWorkflowService } from '@/lib/workflow/server/WorkflowService';
import { verifyToken } from '@/lib/jwt';
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
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
    const { moduleType, projectId, targetState, expectedCurrentState, description } = payload;

    if (!moduleType || !projectId || !targetState) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Perform atomic update via EnterpriseWorkflowService
    const result = await EnterpriseWorkflowService.updateWorkflowStatus({
      moduleType,
      projectId,
      targetState,
      expectedCurrentState,
      actorId: decoded.userId,
      actorRole: decoded.role || 'User',
      description
    });

    return NextResponse.json({ data: result.project });
  } catch (err: any) {
    const message = err.message || 'Internal Server Error';
    if (message.includes('CONFLICT') || message.includes('not available')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
