import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseWorkflowService } from '@/lib/workflow/server/WorkflowService';
import { verifyToken } from '@/lib/jwt';
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const activities = await EnterpriseWorkflowService.getActivityTimeline(projectId);
    return NextResponse.json({ data: activities });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
