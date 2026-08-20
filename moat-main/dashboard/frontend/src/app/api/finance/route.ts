import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { createAdminClient } = require("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { verifyToken } = require("@/lib/jwt");
    const token = req.cookies.get("custom_access_token")?.value;
    let authUser = null;
    if (token) {
      try { authUser = await verifyToken(token); } catch (e) {}
    }
    
    if (!authUser) {
      console.log("Finance API: No auth user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", authUser.sub).single();
    if (!profile || (profile.role !== "Finance Manager" && profile.role !== "Admin" && profile.role !== "Super Admin" && profile.role !== "CEO")) {
      console.log("Finance API: Forbidden role:", profile?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch transactions
    let query = supabase.from("finance_transactions").select("*").order("created_at", { ascending: false });

    // Enforce RLS logically just in case
    if (profile.role === "Finance Manager") {
       query = query.or(`assigned_finance_manager.eq.${authUser.sub},assigned_finance_manager.is.null`);
    }

    const { data, error } = await query;
    if (error) {
       console.log("Finance API: Query error:", error);
       throw error;
    }
    
    // Fetch assignee/uploader info for each project
    const enrichedData = await Promise.all(
      (data || []).map(async (tx) => {
        let uploaderId = null;
        let table = "inventions";
        if (tx.ip_type === "TRADEMARK") table = "trademarks";
        else if (tx.ip_type === "COPYRIGHT") table = "copyrights";

        const { data: project } = await supabase.from(table).select(tx.ip_type === "TRADEMARK" ? "created_by" : "user_id").eq("id", tx.project_id).single();
        
        if (project) {
          uploaderId = tx.ip_type === "TRADEMARK" ? project.created_by : project.user_id;
        }

        let uploaderName = "Unknown";
        if (uploaderId) {
          const { data: user } = await supabase.from("users").select("name").eq("id", uploaderId).single();
          if (user) uploaderName = user.name || "Unknown";
        }

        return { ...tx, assignee_name: uploaderName };
      })
    );

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (err: any) {
    console.log("Finance API: Exception:", err);
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { createAdminClient } = require("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { verifyToken } = require("@/lib/jwt");
    const token = req.cookies.get("custom_access_token")?.value;
    let authUser = null;
    if (token) {
      try { authUser = await verifyToken(token); } catch (e) {}
    }
    
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", authUser.sub).single();
    if (!profile || (profile.role !== "Finance Manager" && profile.role !== "Admin" && profile.role !== "Super Admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { transactionId, paymentStatus } = body;

    if (!transactionId || !paymentStatus || !["PENDING", "PAID", "UNPAID"].includes(paymentStatus)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Assign to the user if not assigned
    const { data: existingTx } = await supabase.from("finance_transactions").select("assigned_finance_manager, project_id").eq("id", transactionId).single();
    
    let updatePayload: any = { 
       payment_status: paymentStatus, 
       updated_by: authUser.sub, 
       updated_at: new Date().toISOString() 
    };

    if (existingTx && !existingTx.assigned_finance_manager) {
       updatePayload.assigned_finance_manager = authUser.sub;
    }

    const { data, error } = await supabase
      .from("finance_transactions")
      .update(updatePayload)
      .eq("id", transactionId)
      .select()
      .single();

    if (error) throw error;

    // Send Notification to CEO
    if (paymentStatus === "PAID") {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      
      const { data: ceos } = await adminClient.from("users").select("id").eq("role", "CEO");
      if (ceos) {
        const notifications = ceos.map((ceo: any) => ({
          id: require('crypto').randomUUID ? require('crypto').randomUUID() : Math.random().toString(36).substring(7),
          title: "Payment Processed",
          description: `Payment for project "${data.project_title}" has been completed.`,
          type: "workflow",
          priority: "high",
          receiver: ceo.id,
          metadata: {
            event_type: "FINANCE_PAYMENT_PAID",
            resource_id: data.project_id,
            action_url: `/dashboard/projects/${data.project_id}`
          },
          is_read: false,
          created_at: new Date().toISOString()
        }));
        await adminClient.from("notifications").insert(notifications);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
