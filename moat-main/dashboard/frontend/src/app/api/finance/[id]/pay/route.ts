import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";
import { EventBus } from "@/lib/events/eventBus";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const userRoleStr = (authUser.role || "").toUpperCase();
    if (!userRoleStr.includes("FINANCE MANAGER") && !userRoleStr.includes("ADMIN") && !userRoleStr.includes("SUPER ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Only Finance Managers can process payments." }, { status: 403 });
    }

    const transactionId = params.id;
    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch the transaction securely
    const { data: existingTx, error: txError } = await supabase
      .from("finance_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !existingTx) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    // 2. Validate CEO approval
    if (existingTx.ceo_approval_status !== "APPROVED") {
      return NextResponse.json({ error: "Payment rejected: Project must be CEO Approved before payment processing." }, { status: 422 });
    }

    // 3. Validate state transitions (Idempotency and Prevent invalid states)
    if (existingTx.payment_status === "PAID") {
      return NextResponse.json({ error: "Payment already processed." }, { status: 409 });
    }

    if (existingTx.payment_status !== "PENDING") {
      return NextResponse.json({ error: `Cannot transition payment status from ${existingTx.payment_status} to PAID.` }, { status: 422 });
    }

    // 4. Perform atomic update
    const { data: updatedTx, error: updateError } = await supabase
      .from("finance_transactions")
      .update({
        payment_status: "PAID",
        updated_by: authUser.sub,
        updated_at: new Date().toISOString(),
        assigned_finance_manager: existingTx.assigned_finance_manager || authUser.sub
      })
      .eq("id", transactionId)
      // Concurrency check: Ensure it is still PENDING
      .eq("payment_status", "PENDING")
      .select()
      .single();

    if (updateError || !updatedTx) {
      return NextResponse.json({ error: "Failed to update payment status. It may have been modified by another user." }, { status: 409 });
    }

    // Fetch the project to get full details for notification routing
    let table = "inventions";
    if (updatedTx.ip_type === "TRADEMARK") table = "trademarks";
    if (updatedTx.ip_type === "COPYRIGHT") table = "copyrights";

    const { data: project } = await supabase.from(table).select("*").eq("id", updatedTx.project_id).single();

    // 5. Emit event to EventBus for Emails, Notifications, and Audit Logs
    EventBus.publishEvent({
      type: "FINANCE_PAYMENT_COMPLETED",
      actorId: authUser.sub,
      actorRole: authUser.role || "Finance Manager",
      resourceId: updatedTx.project_id,
      resourceType: updatedTx.ip_type.toLowerCase(),
      notificationTitle: "Payment Completed",
      notificationMessage: `Payment for ${updatedTx.ip_type.toLowerCase()} project "${updatedTx.project_title}" has been completed by Finance.`,
      actionUrl: `/dashboard/projects/${updatedTx.project_id}`,
      projectData: project || undefined,
      metadata: {
        transaction_id: updatedTx.id,
        title: updatedTx.project_title,
        patent_number: updatedTx.project_number
      }
    });

    return NextResponse.json({ success: true, data: updatedTx });
  } catch (err: any) {
    console.error("[Finance Pay API] Error:", err);
    return await GlobalExceptionHandler.handle(err);
  }
}
