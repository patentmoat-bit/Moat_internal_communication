import WebSocket from "ws";
globalThis.WebSocket = WebSocket;
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== MOAT SESSION SECURITY TESTS ===\n");

  let adminCookie = "";
  let adminUserId = "";

  try {
    // 1. Normal Login
    console.log("Test 1 — Normal login");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@moat.ai", password: "Password123!" })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    
    adminCookie = loginRes.headers.raw()['set-cookie'].join("; ");
    adminUserId = loginData.user.id;
    console.log("✅ PASS: Login successful.\n");

    // Get the latest session
    const { data: session } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", adminUserId)
      .order("login_time", { ascending: false })
      .limit(1)
      .single();

    if (!session) throw new Error("Session not found in DB");

    // 2. Access Token / Active Session API Request
    console.log("Test 2 — Active API request");
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie: adminCookie }
    });
    if (!meRes.ok) throw new Error("Failed to fetch /api/auth/me on active session");
    console.log("✅ PASS: Protected API works during valid session.\n");

    // 3. Inactivity Timeout (31 minutes ago)
    console.log("Test 3 — Inactivity timeout");
    const inactiveTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    await supabase.from("user_sessions").update({ last_activity_at: inactiveTime }).eq("id", session.id);

    const inactiveMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie: adminCookie }
    });
    if (inactiveMeRes.status !== 401) throw new Error(`Expected 401, got ${inactiveMeRes.status}`);
    console.log("✅ PASS: Session correctly rejected after 30 mins inactivity.\n");

    // 4. Absolute Lifetime (8 hours 1 min ago)
    console.log("Test 4/6 — Absolute lifetime / Previous-day login");
    // Reset inactivity first
    await supabase.from("user_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", session.id);
    // Set login time to > 8 hours ago
    const oldLoginTime = new Date(Date.now() - 8.1 * 60 * 60 * 1000).toISOString();
    await supabase.from("user_sessions").update({ login_time: oldLoginTime }).eq("id", session.id);

    const absoluteMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie: adminCookie }
    });
    if (absoluteMeRes.status !== 401) throw new Error(`Expected 401, got ${absoluteMeRes.status}`);
    console.log("✅ PASS: Session correctly rejected after 8 hours absolute lifetime.\n");

    // 8. Protected dashboard middleware
    console.log("Test 8 — Protected dashboard middleware");
    const dashRes = await fetch(`${BASE_URL}/dashboard/ceo`, {
      headers: { cookie: adminCookie },
      redirect: "manual"
    });
    if (dashRes.status !== 307 && dashRes.status !== 302) throw new Error(`Expected redirect, got ${dashRes.status}`);
    const location = dashRes.headers.get("location");
    if (!location.includes("/login") || !location.includes("expired=1")) {
      throw new Error(`Expected redirect to /login with expired=1, got ${location}`);
    }
    console.log("✅ PASS: Middleware correctly redirects expired session to login with expired query param.\n");

  } catch (error) {
    console.error("❌ TEST FAILED:", error.message);
  }
}

runTests();
