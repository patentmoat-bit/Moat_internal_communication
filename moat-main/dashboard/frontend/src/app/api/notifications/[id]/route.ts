import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();
  if (error) return await GlobalExceptionHandler.handle(error);
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from("notifications")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", resolvedParams.id)
    .select()
    .single();
  if (error) return await GlobalExceptionHandler.handle(error);
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", resolvedParams.id);
  if (error) return await GlobalExceptionHandler.handle(error);
  return NextResponse.json({ success: true });
}
