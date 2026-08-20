import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("feedback").select("*").eq("id", resolvedParams.id).single();
  if (error) return await GlobalExceptionHandler.handle(error);
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  const body = await req.json();
  const { id, created_at, ...rest } = body;

  // Fetch current to append version history
  const { data: current } = await supabase.from("feedback").select("*").eq("id", resolvedParams.id).single();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existingVersions: any[] = current.versions || [];
  const newVersion = {
    body: rest.body ?? current.body,
    body_html: rest.body_html ?? current.body_html,
    saved_at: new Date().toISOString(),
    version: existingVersions.length + 1,
  };

  const { data, error } = await supabase
    .from("feedback")
    .update({
      ...rest,
      versions: [...existingVersions, newVersion],
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolvedParams.id)
    .select()
    .single();

  if (error) return await GlobalExceptionHandler.handle(error);
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  // Soft delete
  const { data, error } = await supabase
    .from("feedback")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", resolvedParams.id)
    .select()
    .single();
  if (error) return await GlobalExceptionHandler.handle(error);
  return NextResponse.json(data);
}
