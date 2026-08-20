import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import * as jose from "jose";
import { GlobalExceptionHandler } from "@/lib/errors";

// Minimal auth check for getting user ID and role
const getUserInfo = async (req: NextRequest) => {
  const token = req.cookies.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "super-secret-jwt-key-for-moat-platform");
    const { payload } = await jose.jwtVerify(token, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  try {
    const user = await getUserInfo(req);
    if (!user || !user.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`receiver.eq.${user.userId},receiver.eq.${user.role}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        // Fallback to local DB
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'src', 'app', 'api', 'alerts', 'local_db.json');
        if (fs.existsSync(dbPath)) {
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          const userNotifs = db.notifications.filter((n: any) => n.receiver === user.userId || n.receiver === user.role);
          return NextResponse.json({ data: userNotifs });
        }
        return NextResponse.json({ data: [] });
      }
      throw error;
    }
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserInfo(req);
    if (!user || !user.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json(); // id can be 'all' or specific notification ID
    const supabase = createAdminClient();

    let query = supabase.from("notifications").update({ is_read: true, updated_at: new Date().toISOString() });
    
    if (id === 'all') {
      query = query.or(`receiver.eq.${user.userId},receiver.eq.${user.role}`).eq("is_read", false);
    } else {
      query = query.eq("id", id).or(`receiver.eq.${user.userId},receiver.eq.${user.role}`);
    }

    const { error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'src', 'app', 'api', 'alerts', 'local_db.json');
        if (fs.existsSync(dbPath)) {
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          db.notifications = db.notifications.map((n: any) => {
            if ((n.receiver === user.userId || n.receiver === user.role) && (id === 'all' || n.id === id)) {
              return { ...n, is_read: true };
            }
            return n;
          });
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
          return NextResponse.json({ success: true });
        }
      }
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
