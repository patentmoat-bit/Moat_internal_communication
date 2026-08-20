import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler, ErrorResponseBuilder } from "@/lib/errors";
import { RepositoryLayer } from "@/lib/repository/RepositoryLayer";
import { AuditLogService } from "@/lib/security/auditLogService";
import { generateMockSearchResults } from "@/lib/mockSearchData";
import { searchPatentsFromBigQuery } from "@/lib/bigquery";

export const dynamic = 'force-dynamic';

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

    const { query, searchType = "keyword", options = {} } = body;

    // Input Validation
    if (searchType && typeof searchType !== "string") {
      throw { status: 400, message: "Invalid searchType parameter." };
    }
    if (options && typeof options !== "object") {
      throw { status: 400, message: "Invalid search options provided." };
    }

    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);
    
    // Optional Auth Check for audit logging
    const { data: { user } } = await supabase.auth.getUser();

    const searchString = typeof query === "string" ? query : JSON.stringify(query || "");

    // Extract clean keywords from structured fielded query strings like:
    // 'Title: "Blockchain assurance cybersecurity" AND Assignees / Applicants: "Google"'
    // We pull out all quoted values and any bare words, discarding field-name prefixes.
    const extractKeywords = (raw: string): string => {
      // Step 1: grab all quoted values
      const quoted = [...raw.matchAll(/"([^"]+)"/g)].map(m => m[1]);
      if (quoted.length > 0) return quoted.join(" ");
      // Step 2: strip known field prefixes (Title:, Abstract:, AND, OR, NOT, etc.)
      const stripped = raw
        .replace(/\b(Title|Abstract|Claims|Description|Assignees\s*\/\s*Applicants|Inventors|Country\s*code|IPC[^:]*|CPC[^:]*|Application\s*number|Publication\s*number|Legal\s*status|Cited[^:]*|Citing[^:]*|Publication\s*date|Application\s*date[^:]*|Priority\s*date)\s*:/gi, " ")
        .replace(/\b(AND|OR|NOT|TO)\b/g, " ")
        .replace(/[\[\]()>=<]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return stripped;
    };

    const cleanKeywords = extractKeywords(searchString);

    // Audit Log
    if (user) {
      const auditLogger = new AuditLogService(supabase);
      await auditLogger.logEvent({
        userId: user.id,
        email: user.email,
        eventType: "PATENT_DOCUMENT_SEARCH_EXECUTED",
        ipAddress: request.headers?.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers?.get("user-agent") || "Unknown",
        endpoint: "/api/search",
        status: "INFO",
        category: "DOCUMENTS",
        action: "PATENT_SEARCH",
        metadata: {
          searchQuery: searchString,
          cleanKeywords,
          filters: options.filters || {}
        }
      }).catch(err => console.error("Failed to log search event:", err));
    }

    const startTime = Date.now();

    let finalResultsToReturn: any[] = [];
    let globalBqError = "";

    // Try BigQuery search first
    if (cleanKeywords && cleanKeywords.trim().length > 0) {
      try {
        let bqResults = await searchPatentsFromBigQuery(cleanKeywords);
        if (bqResults && bqResults.length > 0) {
          
          // Verify and correct missing BigQuery inventor/assignee data using live scraping
          try {
            const { getGooglePatentDetails } = require('@/lib/googlePatents');
            for (const p of bqResults) {
              if (p.patent_number && p.patent_number !== "Unknown") {
                const liveDetails = await getGooglePatentDetails(p.patent_number);
                if (liveDetails) {
                  if (liveDetails.assignee && (!p.assignee || p.assignee === "Unknown Assignee")) p.assignee = liveDetails.assignee;
                  if (liveDetails.inventors && liveDetails.inventors.length > 0 && (!p.inventors || p.inventors.length === 0)) p.inventors = liveDetails.inventors;
                }
              }
            }
          } catch(e) {
            console.error("Failed to enrich BigQuery results:", e);
          }

          
          const responsePayload = {
            results: bqResults,
            query_interpretation: `BigQuery search executed for: ${cleanKeywords}`,
            key_concepts: cleanKeywords.split(/\s+/),
            suggested_ipc_codes: [],
            search_stats: {
              total_found: bqResults.length,
              search_time_ms: Date.now() - startTime,
              ai_model: "BigQuery Direct Search",
              modes: [searchType],
              filters: options.filters || {},
            },
          };
          finalResultsToReturn = bqResults;
          
          // Automate saving to temporary internal patentbuffer sheet
          try {
            const fs = require('fs');
            const path = require('path');
            const dbDir = path.join(process.cwd(), 'patentDB');
            if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
            fs.writeFileSync(path.join(dbDir, 'patentbuffer.json'), JSON.stringify(bqResults, null, 2));
          } catch (err) {}

          return ErrorResponseBuilder.success(bqResults, "Operation completed using live BigQuery data.", 200, responsePayload);
        }
      } catch (bqError: any) {
        console.error("BigQuery search failed, falling back to database/Perplexity:", bqError);
        globalBqError = bqError?.message || String(bqError);
      }
    }

    // Perform database search fallback
    let queryBuilder = supabase.from('patent_search').select('*');
    
    if (cleanKeywords && cleanKeywords.trim().length > 0) {
      const terms = cleanKeywords.split(/\s+/).filter(t => t.length > 1);
      if (terms.length > 0) {
        const ilikeQuery = `%${terms.join('%')}%`;
        queryBuilder = queryBuilder.or(`title.ilike.${ilikeQuery},abstract.ilike.${ilikeQuery},description.ilike.${ilikeQuery}`);
      }
    }

    if (options.filters) {
      if (options.filters.country) {
        queryBuilder = queryBuilder.eq('country', options.filters.country);
      }
      if (options.filters.status) {
        queryBuilder = queryBuilder.eq('status', options.filters.status);
      }
    }

    queryBuilder = queryBuilder.limit(20);

    const { data: results, error: dbError } = await queryBuilder;

    // Fallback to Perplexity API if the database table doesn't exist (PGRST205) or fails
    if (dbError) {
      console.warn("Database search failed, falling back to Perplexity Live API:", dbError.message);
      
      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (apiKey) {
        try {
          const prompt = `You are a patent search engine. Retrieve real, actual patents related to the search query: "${cleanKeywords || searchString}". 
Return ONLY a valid JSON object with a single key "results" containing an array of exactly 5 patent objects. Do not include markdown code blocks or any other text.
Each patent object MUST have exactly these fields:
- patent_number (string, e.g., "US1234567B2")
- title (string)
- assignee (string)
- inventors (array of strings)
- filing_date (string, YYYY-MM-DD)
- publication_date (string, YYYY-MM-DD)
- status (string, usually "Active" or "Expired")
- abstract (string)
- ipc_codes (array of strings)
- cpc_codes (array of strings)
- jurisdiction (string, e.g. "US", "EP", "CN")
- citations (number)
- ai_match_score (number between 70 and 99)
- relevance_reason (string explaining why it matches)`;

          const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [
                { role: "system", content: "You are a helpful API that returns strictly valid JSON data without any markdown formatting." },
                { role: "user", content: prompt }
              ],
              temperature: 0.1
            })
          });

          if (!pRes.ok) throw new Error("Perplexity API error: " + await pRes.text());
          
          const data = await pRes.json();
          let content = data.choices[0].message.content.trim();
          
          // Remove markdown formatting if perplexity included it despite instructions
          if (content.startsWith("```json")) {
             content = content.replace(/^```json/, "").replace(/```$/, "");
          } else if (content.startsWith("```")) {
             content = content.replace(/^```/, "").replace(/```$/, "");
          }
          
          const parsed = JSON.parse(content);
          let results = Array.isArray(parsed.results) ? parsed.results : (Array.isArray(parsed) ? parsed : []);
          
          // Verify and correct inventor/assignee data using live scraping to prevent AI hallucinations
          try {
            const { getGooglePatentDetails } = require('@/lib/googlePatents');
            for (const p of results) {
              if (p.patent_number) {
                const liveDetails = await getGooglePatentDetails(p.patent_number);
                if (liveDetails) {
                  if (liveDetails.assignee) p.assignee = liveDetails.assignee;
                  if (liveDetails.inventors && liveDetails.inventors.length > 0) p.inventors = liveDetails.inventors;
                }
              }
            }
          } catch(e) {
            console.error("Failed to enrich perplexity results:", e);
          }

          const responsePayload = {
            results: results,
            query_interpretation: `Live Perplexity search executed for: ${cleanKeywords || searchString}`,
            key_concepts: (cleanKeywords || searchString).split(/\s+/),
            suggested_ipc_codes: [],
            search_stats: {
              total_found: results.length,
              search_time_ms: Date.now() - startTime,
              ai_model: "Perplexity Sonar Pro",
              modes: [searchType],
              filters: options.filters || {},
            },
          };

          finalResultsToReturn = responsePayload.results;

          // Automate saving to temporary internal patentbuffer sheet
          try {
            const fs = require('fs');
            const path = require('path');
            const dbDir = path.join(process.cwd(), 'patentDB');
            if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
            fs.writeFileSync(path.join(dbDir, 'patentbuffer.json'), JSON.stringify(finalResultsToReturn, null, 2));
          } catch (err) {}

          return ErrorResponseBuilder.success(responsePayload.results, "Operation completed using live Perplexity data.", 200, responsePayload);

        } catch (err: any) {
          console.error("Perplexity fallback failed, using local mock data:", err);
        }
      }
      
      // Last resort fallback
      const mockResponse = generateMockSearchResults(cleanKeywords || searchString, options);
      finalResultsToReturn = mockResponse.results;
      
      // Automate saving to temporary internal patentbuffer sheet
      try {
        const fs = require('fs');
        const path = require('path');
        const dbDir = path.join(process.cwd(), 'patentDB');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        fs.writeFileSync(path.join(dbDir, 'patentbuffer.json'), JSON.stringify(finalResultsToReturn, null, 2));
      } catch (err) {}

      return ErrorResponseBuilder.success(mockResponse.results, "Operation completed using fallback data.", 200, mockResponse);
    }

    const searchTimeMs = Date.now() - startTime;

    // Optional: Decorate with some scoring (simplified)
    const decoratedResults = (results || []).map(p => ({
      ...p,
      relevance_score: 85,
      hybrid_score: 85,
      ai_match_score: 85,
      relevance_reason: "Keyword match"
    }));

    const responsePayload = {
      results: decoratedResults,
      query_interpretation: `Database search executed for: ${searchString}`,
      key_concepts: searchString ? searchString.split(/\s+/) : [],
      suggested_ipc_codes: [],
      search_stats: {
        total_found: decoratedResults.length,
        search_time_ms: searchTimeMs,
        ai_model: "None",
        modes: [searchType],
        filters: options.filters || {},
        bq_error: globalBqError
      },
    };

    // Automate saving to temporary internal patentbuffer sheet for ALL results
    try {
      const fs = require('fs');
      const path = require('path');
      const dbDir = path.join(process.cwd(), 'patentDB');
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      const bufferPath = path.join(dbDir, 'patentbuffer.json');
      fs.writeFileSync(bufferPath, JSON.stringify(finalResultsToReturn, null, 2));
    } catch (err) {
      console.error("Failed to write to patentDB buffer:", err);
    }

    return ErrorResponseBuilder.success(finalResultsToReturn, "Operation completed successfully.", 200, responsePayload);
  } catch (err: any) {
    if (err && err.status === 400) {
      return await GlobalExceptionHandler.handle(err, request, err.message);
    }
    console.error("[API Search Error]:", err);
    return await GlobalExceptionHandler.handle(err, request, err?.message || "Search service is temporarily unavailable.");
  }
}
