import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actingRole";
import { readJson, writeJson } from "@/lib/jsonStore";
import { notify, type TargetRole } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface Message {
  id: string;
  sender: string;
  role: string;
  text: string;
  createdAt: string;
}

export async function GET() {
  if (!(await resolveActor())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ messages: readJson<Message[]>("chat.json", []).slice(-200) });
}

/** Shared cross-role channel. Sender and role come from the session. An
 *  optional `mention` role also receives a notification. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const actor = await resolveActor(body.role);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const text = String(body.text ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const msg: Message = {
    id: crypto.randomUUID(),
    sender: actor.name,
    role: actor.role ?? actor.roles[0],
    text,
    createdAt: new Date().toISOString(),
  };
  writeJson("chat.json", [...readJson<Message[]>("chat.json", []), msg].slice(-1000));

  if (body.mention) {
    notify({
      to: body.mention as TargetRole,
      title: `${actor.name} mentioned your team`,
      message: text.slice(0, 200),
      sender: actor.name,
      actionUrl: "/inbox",
      kind: "mention",
    });
  }
  return NextResponse.json({ success: true, message: msg });
}
