import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus } from "@/lib/events/eventBus";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await props.params;
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const version = parseInt((formData.get("version") as string) || "1", 10);
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Upload to Supabase Storage using Admin client (bypasses RLS issues)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${id}/${fileName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Make sure bucket exists first using upsert-like behavior, but since we can't create buckets easily via client API,
    // we assume the SQL script ran. If it didn't, the admin client will still throw an error, but at least
    // RLS is bypassed.
    const { error: uploadError } = await supabase.storage
      .from('copyrights')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });
      
    if (uploadError) {
      // If the bucket doesn't exist, we can try to create it on the fly
      if (uploadError.message.includes("Bucket not found") || uploadError.name === "BucketNotFound") {
         await supabase.storage.createBucket('copyrights', { public: false });
         // Try upload again
         const { error: retryError } = await supabase.storage
           .from('copyrights')
           .upload(filePath, buffer, {
             contentType: file.type || 'application/octet-stream'
           });
         if (retryError) throw retryError;
      } else {
        throw uploadError;
      }
    }

    // 2. Save metadata to DB
    const { data: docData, error: dbError } = await supabase
      .from("copyright_documents")
      .insert([{
        copyright_id: id,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: filePath,
        version: version
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // Get the copyright product data for the notification
    const { data: copyrightData } = await supabase
      .from("copyrights")
      .select("id, product_name") // Phase 8 Optimization
      .eq("id", id)
      .single();

    // Trigger Notification/Audit Workflow via EventBus
    EventBus.publishEvent({
      type: "DOCUMENT_UPLOADED",
      resourceId: id,
      resourceType: "copyright",
      notificationTitle: "New Copyright Document Uploaded",
      notificationMessage: `A new document (${file.name}) was uploaded to Copyright project "${copyrightData?.product_name || id}".`,
      actionUrl: "/dashboard/patent-analyst/copyrights",
      projectData: copyrightData ? { ...copyrightData, title: copyrightData.product_name } : undefined
    });

    return NextResponse.json({ data: docData });
  } catch (err: any) {
    console.error("Upload Route Error:", err);
    return await GlobalExceptionHandler.handle(err);
  }
}
