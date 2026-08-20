import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { detail: "Email is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: userList, error: lookupError } = await supabase.auth.admin.listUsers();

    if (lookupError) {
      return await GlobalExceptionHandler.handle(lookupError);
    }

    const user = userList.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { detail: "User not found." },
        { status: 404 }
      );
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ detail: "Email already confirmed." });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      return await GlobalExceptionHandler.handle(updateError);
    }

    return NextResponse.json({ detail: "Email confirmed successfully." });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
