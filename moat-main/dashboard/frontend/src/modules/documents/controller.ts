import { NextRequest, NextResponse } from "next/server";
import { DocumentsService } from "./service";
import { PatentDocumentSchema, DocumentVersionSchema, WorkflowTransitionSchema, ReviewCommentSchema } from "./validation";
import { cookies } from "next/headers";
import { WorkflowEmailService } from "@/lib/workflow/WorkflowEmailService";
import { AuditLogService } from "@/lib/security/auditLogService";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@/lib/jwt";
import { AuthorizationMiddleware } from "@/lib/security/authorization";
import { EventBus } from "@/lib/events/eventBus";

const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Server-only module: never silently downgrade to the public anon key.
  throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
}
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseAdminUrl, supabaseAdminKey);

const service = new DocumentsService();
const auditLog = new AuditLogService(supabaseAdmin);

async function getAuthUser(req?: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub as string,
    name: (payload.name as string) || (payload.email as string)?.split("@")[0] || "User",
    role: (payload.role as string) || "Patent Analyst",
  };
}

export class DocumentsController {
  static async create(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = PatentDocumentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "documents:upload",
        projectId: parsed.data.project_id,
        endpoint: "/api/documents",
        httpMethod: "POST",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const data = await service.createDocument(parsed.data, user.id);

      // Trigger notification for new document draft
      try {
        await EventBus.publishEvent({
          type: 'DOCUMENT_UPLOADED',
          actorId: user.id,
          actorRole: user.role,
          resourceId: data.id,
          resourceType: 'document',
          targetRole: 'CEO',
          notificationTitle: `New Document Draft Created`,
          notificationMessage: `${user.name} created a new document draft: ${parsed.data.title}.`,
          actionUrl: `/dashboard/ceo/approvals`,
          metadata: { title: parsed.data.title },
        });
      } catch (notifyErr) {
        console.error("Notification delivery failed on create:", notifyErr);
      }

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("DocumentsController.create ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async list(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "documents:read",
        endpoint: "/api/documents",
        httpMethod: "GET",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const data = await service.getAllDocuments(user.id, user.role);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("DocumentsController.list ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async getById(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;
      
      const authRes = await AuthorizationMiddleware.authorize({
        token: req.cookies.get("custom_access_token")?.value,
        userId: user.id,
        userRole: user.role,
        requiredPermission: "documents:read",
        targetObjectId: resolvedParams.id,
        targetObjectType: "document",
        endpoint: `/api/documents/${resolvedParams.id}`,
        httpMethod: "GET",
        clientIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      if (!authRes.authorized) {
        return NextResponse.json({ error: authRes.reason }, { status: 403 });
      }

      const data = await service.getDocumentById(resolvedParams.id, user.id, user.role);
      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("DocumentsController.getById ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 403 : 500 });
    }
  }

  static async addVersion(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = DocumentVersionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const resolvedParams = await params;
      const doc = await service.getDocumentById(resolvedParams.id, user.id, user.role);
      
      const data = await service.addVersion(resolvedParams.id, parsed.data, user.id);

      // Audit Log
      await auditLog.logEvent({
        userId: user.id,
        email: user.name,
        eventType: "DOCUMENT_UPLOADED",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        endpoint: req.nextUrl.pathname,
        status: "SUCCESS",
        actorRole: user.role,
        resourceId: resolvedParams.id,
        resourceType: "document",
        metadata: { file_name: parsed.data.file_name, version_number: parsed.data.version_number }
      });

      // Try Notification
      try {
        await EventBus.publishEvent({
          type: 'DOCUMENT_UPLOADED',
          actorId: user.id,
          actorRole: user.role,
          resourceId: resolvedParams.id,
          resourceType: 'document',
          targetRole: 'CEO',
          notificationTitle: 'New Document Version Uploaded',
          notificationMessage: `${user.name} uploaded a new version: ${parsed.data.file_name}.`,
          actionUrl: `/dashboard/ceo/approvals`,
          metadata: { title: doc.title },
        });
      } catch (notifyErr) {
        console.error("Notification delivery failed:", notifyErr);
      }

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("DocumentsController.addVersion ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async transitionStatus(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = WorkflowTransitionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const resolvedParams = await params;
      // Fetch current status
      const doc = await service.getDocumentById(resolvedParams.id, user.id, user.role as any);
      const previousStatus = doc.status;

      // Concurrency protection
      if (parsed.data.current_status && parsed.data.current_status !== previousStatus) {
        return NextResponse.json({ error: "CONCURRENCY_ERROR", message: "This project was updated while you were working. The latest project status is now available." }, { status: 409 });
      }

      const data = await service.transitionStatus(resolvedParams.id, previousStatus, parsed.data.new_status, user.id, parsed.data.notes);

      // Audit Log
      await auditLog.logEvent({
        userId: user.id,
        email: user.name,
        eventType: "PATENT_STATUS_CHANGED",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        endpoint: req.nextUrl.pathname,
        status: "SUCCESS",
        actorRole: user.role,
        resourceId: resolvedParams.id,
        resourceType: "document",
        oldValue: previousStatus,
        newValue: parsed.data.new_status
      });

      try {
        // Map status transitions to explicit event types for the routing engine
        let eventType: "STATUS_UPDATED" | "DESIGN_REQUESTED" | "REPORT_SUBMITTED" | "CEO_APPROVED" | "CEO_REJECTED" | "REVISION_REQUIRED" | "DOCUMENT_UPLOADED" = "STATUS_UPDATED";
        
        if (parsed.data.new_status === "Pending Design Review") eventType = "DESIGN_REQUESTED";
        else if (parsed.data.new_status === "CEO Approval Pending") eventType = "REPORT_SUBMITTED";
        else if (parsed.data.new_status === "CEO Approved") eventType = "CEO_APPROVED";
        else if (parsed.data.new_status === "CEO Rejected") eventType = "CEO_REJECTED";
        else if (parsed.data.new_status === "Changes Requested") eventType = "REVISION_REQUIRED";
        else if (parsed.data.new_status === "Uploaded by Patent Analyst") eventType = "DOCUMENT_UPLOADED";

        // Publish event for mail notification
        await EventBus.publishEvent({
          type: eventType as any,
          actorId: user.id,
          actorRole: user.role,
          resourceId: resolvedParams.id,
          resourceType: 'document',
          targetRole: 'CEO', // Legacy fallback; routing rules override this
          notificationTitle: `Document Status Updated: ${parsed.data.new_status}`,
          notificationMessage: `${user.name} changed the document status from ${previousStatus} to ${parsed.data.new_status}.`,
          actionUrl: `/dashboard/ceo/approvals`,
          metadata: { title: doc.title, old_status: previousStatus, new_status: parsed.data.new_status },
        });

      } catch (notifyErr) {
        console.error("Notification delivery failed:", notifyErr);
      }

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("DocumentsController.transitionStatus ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async addComment(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await req.json();
      const parsed = ReviewCommentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const resolvedParams = await params;
      const data = await service.addComment(resolvedParams.id, parsed.data, user.id, user.role);

      // Audit Log
      await auditLog.logEvent({
        userId: user.id,
        email: user.name,
        eventType: "DOCUMENT_MODIFIED",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        endpoint: req.nextUrl.pathname,
        status: "SUCCESS",
        actorRole: user.role,
        resourceId: resolvedParams.id,
        resourceType: "document",
        metadata: { action: "added_comment" }
      });

      // Try Notification
      try {
        const doc = await service.getDocumentById(resolvedParams.id, user.id, user.role as any);
        await EventBus.publishEvent({
          type: 'COMMENT_ADDED',
          actorId: user.id,
          actorRole: user.role,
          resourceId: resolvedParams.id,
          resourceType: 'document',
          targetRole: 'CEO',
          notificationTitle: 'New Document Comment',
          notificationMessage: `${user.name} added a comment: "${parsed.data.comment_text.substring(0, 50)}${parsed.data.comment_text.length > 50 ? '...' : ''}"`,
          actionUrl: `/dashboard/ceo/approvals`,
          metadata: { title: doc.title },
        });
      } catch (notifyErr) {
        console.error("Notification delivery failed:", notifyErr);
      }

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      console.error("DocumentsController.addComment ERROR:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
