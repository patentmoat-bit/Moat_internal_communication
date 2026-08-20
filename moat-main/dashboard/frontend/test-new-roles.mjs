import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import ws from "ws";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch }, // Provide fetch to run natively if needed
  realtime: { transport: ws }
});

const authClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch },
  realtime: { transport: ws }
});
// Need to add transport: ws to createClient options?
// RealtimeClient uses globalThis.WebSocket by default. 
global.WebSocket = ws;

async function runTests() {
  console.log("==========================================");
  console.log("🚀 STARTING NEW ROLE SECURITY TESTS");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Create a Finance Manager User
  const financeEmail = `finance_${Date.now()}@moat.ai`;
  const { data: financeAuth, error: authErr1 } = await adminClient.auth.admin.createUser({
    email: financeEmail,
    password: "Password123!",
    email_confirm: true,
  });
  
  if (authErr1) throw new Error("Failed to create test finance user");
  const financeUserId = financeAuth.user.id;

  await adminClient.from("users").insert({
    id: financeUserId,
    email: financeEmail,
    name: "Test Finance Manager",
    role: "Finance Manager",
  });

  // 2. Create a Patent Drafter User
  const drafterEmail = `drafter_${Date.now()}@moat.ai`;
  const { data: drafterAuth, error: authErr2 } = await adminClient.auth.admin.createUser({
    email: drafterEmail,
    password: "Password123!",
    email_confirm: true,
  });

  if (authErr2) throw new Error("Failed to create test drafter user");
  const drafterUserId = drafterAuth.user.id;

  await adminClient.from("users").insert({
    id: drafterUserId,
    email: drafterEmail,
    name: "Test Drafter",
    role: "Patent Drafter",
  });

  // 3. Create a test invention and workspace
  const workspaceId = crypto.randomUUID();
  const { error: wsErr } = await adminClient.from("workspaces").insert({
    id: workspaceId,
    name: "Test Workspace",
    user_id: financeUserId
  });
  
  if (wsErr) throw new Error("Failed to create test workspace: " + JSON.stringify(wsErr));

  const { data: invention, error: invErr } = await adminClient.from("inventions").insert({
    title: "Unassigned Secret Patent",
    description: "Top secret",
    status: "Drafting",
    user_id: financeUserId,
    workspace_id: workspaceId
  }).select().single();

  if (invErr) throw new Error("Failed to create test invention: " + JSON.stringify(invErr));

  // 4. Authenticate as Finance Manager
  const { data: financeSession } = await authClient.auth.signInWithPassword({
    email: financeEmail,
    password: "Password123!",
  });
  const financeClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${financeSession.session.access_token}` }, fetch: fetch },
    auth: { persistSession: false },
    realtime: { transport: ws }
  });

  // 5. Authenticate as Patent Drafter
  const { data: drafterSession } = await authClient.auth.signInWithPassword({
    email: drafterEmail,
    password: "Password123!",
  });
  const drafterClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${drafterSession.session.access_token}` }, fetch: fetch },
    auth: { persistSession: false },
    realtime: { transport: ws }
  });

  // --- TESTS ---

  // Test 1: Finance Manager cannot read copyrights
  const { data: copyrights, error: copyErr } = await financeClient.from("copyrights").select("*");
  assert(
    copyrights.length === 0,
    "Finance Manager should not see other users' copyrights"
  );

  // Test 2: Patent Drafter cannot read unassigned patents
  const { data: unassignedPatents, error: patentErr } = await drafterClient.from("inventions").select("*").eq("id", invention.id);
  assert(
    unassignedPatents.length === 0,
    "Patent Drafter should not see unassigned patents"
  );

  // Test 3: Patent Drafter CAN read assigned patents
  await adminClient.from("project_members").insert({
    project_id: workspaceId,
    user_id: drafterUserId,
    role: "editor"
  });

  const { data: assignedPatents, error: patentErr2 } = await drafterClient.from("inventions").select("*").eq("id", invention.id);
  assert(
    assignedPatents.length === 1,
    "Patent Drafter CAN read assigned patents"
  );

  // Test 4: Finance Manager can read finance_transactions
  const { data: tx, error: txErr } = await adminClient.from("finance_transactions").insert({
    project_id: invention.id,
    project_title: "Test Transaction",
    ip_type: "PATENT",
    assigned_finance_manager: financeUserId,
    ceo_approval_status: "APPROVED"
  }).select().single();
  
  if (txErr) throw new Error("Failed to create tx: " + JSON.stringify(txErr));

  const { data: finData } = await financeClient.from("finance_transactions").select("*").eq("id", tx.id);
  assert(
    finData.length === 1,
    "Finance Manager CAN read assigned finance transactions"
  );

  // Test 5: Finance Manager cannot read UNASSIGNED finance_transactions
  const { data: tx2 } = await adminClient.from("finance_transactions").insert({
    project_id: invention.id,
    project_title: "Test Transaction 2",
    ip_type: "PATENT",
    ceo_approval_status: "APPROVED"
  }).select().single();

  const { data: finData2 } = await financeClient.from("finance_transactions").select("*").eq("id", tx2.id);
  assert(
    finData2.length === 0,
    "Finance Manager CANNOT read unassigned finance transactions"
  );

  // Cleanup
  await adminClient.auth.admin.deleteUser(financeUserId);
  await adminClient.auth.admin.deleteUser(drafterUserId);
  await adminClient.from("inventions").delete().eq("id", invention.id);
  await adminClient.from("finance_transactions").delete().eq("id", tx.id);
  await adminClient.from("finance_transactions").delete().eq("id", tx2.id);

  console.log("\n==========================================");
  if (failed === 0) {
    console.log(`✅ ALL TESTS PASSED (${passed}/${passed})`);
  } else {
    console.error(`❌ ${failed} TESTS FAILED`);
    process.exit(1);
  }
  console.log("==========================================");
}

runTests().catch(console.error);
