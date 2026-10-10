import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Return mock data for assigned drafts so the UI can render
    if (action === 'assigned') {
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'mock-1',
            title: 'AI-Driven Code Autocompletion Engine',
            status: 'drafting',
            assigned_at: new Date().toISOString(),
            deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
            priority: 'High'
          },
          {
            id: 'mock-2',
            title: 'Distributed State Synchronization Protocol',
            status: 'review',
            assigned_at: new Date().toISOString(),
            deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
            priority: 'Medium'
          }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      data: []
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
