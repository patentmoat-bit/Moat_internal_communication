import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

// None of the four methods had an auth check — any authenticated user could
// read or rewrite org-wide notification routing rules. Admin-only now.
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("notification_rules")
      .select(`
        *,
        notification_recipients (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return await GlobalExceptionHandler.handle(error);
    }

    const rulesWithAssignee = data.map(rule => ({
      ...rule,
      notify_assignee: rule.notification_recipients?.some((r: any) => r.recipient_value === "assigned_to") || false,
      notify_user_ids: rule.notification_recipients?.filter((r: any) => r.recipient_type === "SPECIFIC_USER").map((r: any) => r.recipient_value) || []
    }));

    return NextResponse.json({ data: rulesWithAssignee });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const supabase = createAdminClient();

    const { name, description, event_type, priority, status, notify_assignee, notify_user_ids, recipients, conditions } = body;

    if (!name || !event_type) {
      return NextResponse.json({ error: "Name and Event Type are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notification_rules")
      .insert([
        {
          name,
          description,
          event_type,
          priority: priority || "Normal",
          status: status || "Active"
        }
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Process generic recipients from UI
    if (recipients && Array.isArray(recipients)) {
      const genericRecipients = recipients.filter(r => r.type && r.value).map(r => ({
        rule_id: data.id,
        recipient_type: r.type,
        recipient_value: r.value,
        routing_type: r.routing || "TO"
      }));
      if (genericRecipients.length > 0) {
        await supabase.from("notification_recipients").insert(genericRecipients);
      }
    } else {
      // Legacy fallback
      if (notify_assignee) {
        await supabase.from("notification_recipients").insert({
          rule_id: data.id,
          recipient_type: "PROJECT_FIELD",
          recipient_value: "assigned_to",
          routing_type: "TO"
        });
      }

      if (notify_user_ids && Array.isArray(notify_user_ids)) {
        const specificUserRecipients = notify_user_ids.map((id: string) => ({
          rule_id: data.id,
          recipient_type: "SPECIFIC_USER",
          recipient_value: id,
          routing_type: "TO"
        }));
        if (specificUserRecipients.length > 0) {
          await supabase.from("notification_recipients").insert(specificUserRecipients);
        }
      }
    }

    // Attempt to process conditions if table exists
    if (conditions && Array.isArray(conditions) && conditions.length > 0) {
      const validConditions = conditions.filter(c => c.field && c.operator && c.value).map(c => ({
        rule_id: data.id,
        field_name: c.field,
        operator: c.operator,
        field_value: c.value
      }));
      if (validConditions.length > 0) {
        // Soft fail if table doesn't exist yet
        try {
          await supabase.from("notification_rule_conditions").insert(validConditions);
        } catch (e) {
          console.warn("Could not insert conditions, table might not exist yet", e);
        }
      }
    }

    return NextResponse.json({ data, success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const supabase = createAdminClient();

    const { id, name, description, event_type, priority, status, notify_assignee, notify_user_ids, recipients, conditions } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("notification_rules")
      .update({
        name,
        description,
        event_type,
        priority,
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from("notification_recipients")
      .delete()
      .eq("rule_id", id);

    if (recipients && Array.isArray(recipients)) {
      const genericRecipients = recipients.filter(r => r.type && r.value).map(r => ({
        rule_id: data.id,
        recipient_type: r.type,
        recipient_value: r.value,
        routing_type: r.routing || "TO"
      }));
      if (genericRecipients.length > 0) {
        await supabase.from("notification_recipients").insert(genericRecipients);
      }
    } else {
      const newRecipients = [];
      if (notify_assignee) {
        newRecipients.push({
          rule_id: id,
          recipient_type: "PROJECT_FIELD",
          recipient_value: "assigned_to",
          routing_type: "TO"
        });
      }

      if (notify_user_ids && Array.isArray(notify_user_ids)) {
        notify_user_ids.forEach((userId: string) => {
          newRecipients.push({
            rule_id: id,
            recipient_type: "SPECIFIC_USER",
            recipient_value: userId,
            routing_type: "TO"
          });
        });
      }

      if (newRecipients.length > 0) {
        await supabase.from("notification_recipients").insert(newRecipients);
      }
    }

    // Try to update conditions
    try {
      await supabase.from("notification_rule_conditions").delete().eq("rule_id", id);
      if (conditions && Array.isArray(conditions) && conditions.length > 0) {
        const validConditions = conditions.filter(c => c.field && c.operator && c.value).map(c => ({
          rule_id: data.id,
          field_name: c.field,
          operator: c.operator,
          field_value: c.value
        }));
        if (validConditions.length > 0) {
          await supabase.from("notification_rule_conditions").insert(validConditions);
        }
      }
    } catch (e) {
      console.warn("Could not update conditions, table might not exist yet", e);
    }

    return NextResponse.json({ data, success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("notification_rules")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
