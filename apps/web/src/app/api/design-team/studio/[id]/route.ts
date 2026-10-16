import { NextRequest, NextResponse } from "next/server";
import { DesignStudioService } from "@/lib/design-team/studioService";
import { getAuthenticatedUser } from "@/lib/serverAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = resolvedParams.id || "PRJ-10023";
    const data = DesignStudioService.getProjectStudioData(projectId);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = resolvedParams.id || "PRJ-10023";
    const body = await req.json();
    const action = body.action;

    if (action === "save_figure") {
      const result = DesignStudioService.saveFigure(projectId, body.figure, authUser.name || authUser.email);
      return NextResponse.json(result);
    }

    if (action === "add_figure") {
      const figure = DesignStudioService.addFigure(projectId, body.title, body.number);
      return NextResponse.json({ success: true, figure });
    }

    if (action === "duplicate_figure") {
      const figure = DesignStudioService.duplicateFigure(projectId, body.figureId);
      return NextResponse.json({ success: true, figure });
    }

    if (action === "delete_figure") {
      const ok = DesignStudioService.deleteFigure(projectId, body.figureId);
      return NextResponse.json({ success: true, deleted: ok });
    }

    if (action === "save_document") {
      const result = DesignStudioService.saveTechnicalDocument(projectId, body.document, authUser.name || authUser.email);
      return NextResponse.json(result);
    }

    if (action === "upload_project_document") {
      const result = DesignStudioService.uploadProjectDocument(projectId, {
        ...body.document,
        author: authUser.name || authUser.email
      });
      return NextResponse.json(result);
    }

    if (action === "delete_project_document") {
      const result = DesignStudioService.deleteProjectDocument(projectId, body.documentId);
      return NextResponse.json(result);
    }

    if (action === "bump_project_document_version") {
      const result = DesignStudioService.bumpDocumentVersion(projectId, body.documentId, {
        ...body.payload,
        author: authUser.name || authUser.email
      });
      return NextResponse.json(result);
    }

    if (action === "submit_review") {
      const result = DesignStudioService.submitForReview(projectId, {
        recipientRole: body.recipientRole,
        recipientName: body.recipientName,
        selectedFigures: body.selectedFigures || [],
        selectedDocs: body.selectedDocs || [],
        message: body.message || "",
        userId: authUser.name || authUser.email
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
