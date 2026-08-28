import { NextRequest, NextResponse } from "next/server";
import { PatentsService } from "./service";
import { CreatePatentProjectSchema, UpdatePatentProjectSchema, UpdatePatentStatusSchema, PatentDocumentSchema } from "./validation";
import { createClient } from "@/lib/supabase/server";
import { EventBus } from "@/lib/events/eventBus";

const service = new PatentsService();

import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

async function getAuthUser() {
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

export class PatentsController {
  static async listProjects(req: NextRequest) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const data = await service.listProjects();
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async createProject(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = CreatePatentProjectSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role === "CEO") {
        return NextResponse.json({ error: "CEO cannot create projects" }, { status: 403 });
      }

      const data = await service.createProject({
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        filing_region: parsed.data.filing_region,
        created_by: user?.id || null
      });

      await EventBus.publishEvent({
        type: 'PROJECT_CREATED',
        actorId: user?.id,
        actorRole: user?.role,
        resourceId: data.id,
        targetRole: 'CEO',
        notificationTitle: 'New Patent Project Created',
        notificationMessage: `${user?.name || "System"} created a new patent project: ${parsed.data.title}.`,
        actionUrl: `/dashboard/ceo/projects/${data.id}`,
      });

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateProject(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const body = await req.json();
      const parsed = UpdatePatentProjectSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role === "CEO") {
        return NextResponse.json({ error: "CEO can only update statuses" }, { status: 403 });
      }

      const resolvedParams = await params;
      const data = await service.updateProject(resolvedParams.id, parsed.data, user?.id);

      await EventBus.publishEvent({
        type: 'PROJECT_UPDATED',
        actorId: user.id,
        actorRole: user.role,
        resourceId: data.id,
        targetRole: 'CEO',
        notificationTitle: 'Patent Project Updated',
        notificationMessage: `${user.name} updated the project: ${parsed.data.title || 'Details changed'}.`,
        actionUrl: `/dashboard/ceo/projects/${data.id}`,
      });

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async deleteProject(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role !== "Admin") {
        return NextResponse.json({ error: "Only Admins can delete projects" }, { status: 403 });
      }

      const resolvedParams = await params;
      await service.deleteProject(resolvedParams.id);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async updateStatus(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const body = await req.json();
      const parsed = UpdatePatentStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }

      const user = await getAuthUser();
      const resolvedParams = await params;
      const data = await service.updateStatus(resolvedParams.id, parsed.data.status, parsed.data.notes);

      await EventBus.publishEvent({
        type: 'STATUS_UPDATED',
        actorId: user?.id,
        actorRole: user?.role,
        resourceId: resolvedParams.id,
        notificationTitle: `Project Status Updated: ${parsed.data.status}`,
        notificationMessage: `A patent project has moved to ${parsed.data.status}.`,
        targetRole: 'CEO'
      });

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async listPortfolio(req: NextRequest) {
    try {
      const data = await service.getPortfolio();
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async listDocuments(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const resolvedParams = await params;
      const data = await service.listDocuments(resolvedParams.id);
      return NextResponse.json({ data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  static async uploadDocument(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const user = await getAuthUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (user.role === "CEO") {
        return NextResponse.json({ error: "CEO cannot upload documents" }, { status: 403 });
      }

      const body = await req.json();
      const parsed = PatentDocumentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }
      
      const resolvedParams = await params;
      const data = await service.uploadDocument(resolvedParams.id, parsed.data.name, parsed.data.url, parsed.data.file_type, parsed.data.size);

      await EventBus.publishEvent({
        type: 'DOCUMENT_UPLOADED',
        actorId: user.id,
        actorRole: user.role,
        resourceId: resolvedParams.id,
        notificationTitle: 'New Document Uploaded',
        notificationMessage: `${user.name} uploaded ${parsed.data.name} to the project.`,
      });

      return NextResponse.json({ success: true, data });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}

