import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AuditLogService } from "@/lib/security/auditLogService";

export const maxDuration = 300; // Allow up to 5 minutes for complex AI responses

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Optional auth — only used for audit logging, not to gate access
    const { data: { user } } = await supabase.auth.getUser();

    const { messages, model = "sonar-pro", temperature = 0.2, max_tokens } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    if (user) {
      const auditLogger = new AuditLogService(supabase);
      await auditLogger.logEvent({
        userId: user.id,
        email: user.email,
        eventType: "AI_RESEARCH_EXECUTED",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "Unknown",
        endpoint: "/api/ai-hub/perplexity",
        status: "INFO",
        category: "AI_RESEARCH",
        metadata: {
          model,
          messagesCount: messages.length,
          promptLength: messages[messages.length - 1]?.content?.length || 0
        }
      }).catch(err => console.error("Failed to log AI event:", err));
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error("PERPLEXITY_API_KEY is missing from environment variables.");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(max_tokens ? { max_tokens } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", errorText);
      return NextResponse.json({ error: "Upstream API error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error calling Perplexity API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
