import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler, ErrorResponseBuilder } from "@/lib/errors";
import { RepositoryLayer, RepositoryException } from "@/lib/repository/RepositoryLayer";
import { AuditLogService } from "@/lib/security/auditLogService";
import { PerplexityClient } from "@/lib/services/perplexity/client";
import { generateMockSearchResults } from "@/lib/mockSearchData";

// Simple in-memory rate limiting to prevent abuse
const rateLimitCache = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

export async function POST(request: NextRequest | Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      throw { status: 400, message: "Invalid JSON body provided." };
    }

    if (!body || typeof body !== "object") {
      throw { status: 400, message: "Invalid request parameters provided." };
    }

    const { patent_number } = body;
    if (!patent_number || typeof patent_number !== "string") {
      throw { status: 400, message: "Missing or invalid patent_number parameter." };
    }

    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    // 1. Optional Auth Check
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Rate Limiting Check (fallback to IP if no user)
    const clientId = user?.id || request.headers?.get("x-forwarded-for") || "anonymous";
    const now = Date.now();
    const userLimit = rateLimitCache.get(clientId);
    if (userLimit && now - userLimit.timestamp < RATE_LIMIT_WINDOW_MS) {
      if (userLimit.count >= RATE_LIMIT_MAX) {
        throw { status: 429, message: "Rate limit exceeded for intelligence analysis." };
      }
      userLimit.count += 1;
    } else {
      rateLimitCache.set(clientId, { count: 1, timestamp: now });
    }

    // 4. Retrieve real patent data
    let patentRecord = null;
    try {
      const res = await repo.execute(
        repo.safeFrom("patent_search").select("*").eq("patent_number", patent_number).single()
      );
      patentRecord = res.data;
    } catch (e) {
      console.warn("DB fetch failed, checking mock data for patent:", e);
      // Fallback: check if it's in the mock data
      const mockData = generateMockSearchResults("");
      patentRecord = mockData.results.find((p: any) => p.patent_number === patent_number);
    }

    if (!patentRecord) {
      throw { status: 404, message: "Patent record not found." };
    }

    // 5. Data Classification Check
    // We only pass safe public fields to the external API inside PerplexityClient.analyzePatent
    const client = new PerplexityClient();

    // 6. Execute AI Request
    const analysis = await client.analyzePatent(patentRecord);

    // 7. Audit Logging (Usage Monitoring)
    if (user) {
      const auditLogger = new AuditLogService(supabase);
      await auditLogger.logEvent({
        userId: user.id,
        email: user.email,
        eventType: "AI_PATENT_INTELLIGENCE_EXECUTED",
        ipAddress: request.headers?.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers?.get("user-agent") || "Unknown",
        endpoint: "/api/intelligence/patent",
        status: "INFO",
        category: "AI_RESEARCH",
        action: "ANALYZE_PATENT",
        metadata: {
          patent_number: patent_number,
          provider: "perplexity",
          model: "sonar-pro"
        }
      }).catch(err => console.error("Failed to log intelligence event:", err));
    }

    return ErrorResponseBuilder.success(analysis, "Intelligence analysis completed successfully.");
  } catch (err: any) {
    if (err && err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
      return await GlobalExceptionHandler.handle(err, request, err.message);
    }
    console.error("[Intelligence API Error]:", err);
    return await GlobalExceptionHandler.handle(err, request, "AI intelligence is temporarily unavailable. Please try again later.");
  }
}
