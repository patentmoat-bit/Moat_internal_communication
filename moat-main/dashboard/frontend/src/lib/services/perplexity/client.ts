import { PerplexityRequest, IntelligenceResponse } from "./types";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const DEFAULT_TIMEOUT_MS = 60000;

class PerplexityApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "PerplexityApiError";
  }
}

export class PerplexityClient {
  private apiKey: string;

  constructor() {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) {
      throw new Error("Perplexity API key is not configured.");
    }
    this.apiKey = key;
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async execute(request: PerplexityRequest, retries = 1): Promise<any> {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          PERPLEXITY_API_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: request.model || "sonar-pro",
              messages: request.messages,
              temperature: request.temperature ?? 0.2,
              ...(request.max_tokens ? { max_tokens: request.max_tokens } : {}),
            }),
          },
          DEFAULT_TIMEOUT_MS
        );

        if (!response.ok) {
          const status = response.status;
          // Do not retry 401 or 403
          if (status === 401 || status === 403) {
            throw new PerplexityApiError("Authentication failed with provider.", status);
          }
          if (status === 429) {
            throw new PerplexityApiError("Rate limit exceeded with provider.", status);
          }
          throw new PerplexityApiError(`Provider API error: ${status}`, status);
        }

        const data = await response.json();
        return data;
      } catch (err: any) {
        lastError = err;
        if (err.name === "AbortError") {
          lastError = new PerplexityApiError("Request timed out.", 408);
        }
        
        // Don't retry auth errors or timeouts if we don't want to
        if (lastError instanceof PerplexityApiError && (lastError.status === 401 || lastError.status === 403)) {
          break;
        }

        if (attempt < retries) {
          // simple backoff
          await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("Unknown error during Perplexity API call.");
  }

  public async analyzePatent(patentData: any): Promise<IntelligenceResponse> {
    // Sanitize patentData to only include public/safe fields
    const safeData = {
      title: patentData.title,
      abstract: patentData.abstract,
      patent_number: patentData.patent_number,
      ipc_codes: patentData.ipc_codes,
      inventors: patentData.inventors,
      assignees: patentData.assignees,
      publication_date: patentData.publication_date,
    };

    const prompt = `You are an expert Patent Analyst providing external intelligence.
Analyze the following patent record and provide a structured JSON response exactly matching this schema:
{
  "technology_summary": "string",
  "technology_trends": ["string"],
  "relevant_companies": ["string"],
  "research_sources": ["string"],
  "external_prior_art": ["string"],
  "risk_indicators": ["string"],
  "analysis": "string",
  "confidence": "High" | "Medium" | "Low"
}
Do not include markdown blocks, just raw JSON.

Patent Record:
${JSON.stringify(safeData, null, 2)}`;

    const request: PerplexityRequest = {
      model: "sonar-pro",
      messages: [
        { role: "system", content: "You are a professional patent analyst." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1
    };

    const rawResponse = await this.execute(request, 1);
    const content = rawResponse.choices?.[0]?.message?.content || "{}";

    try {
      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanContent) as IntelligenceResponse;
      return parsed;
    } catch (err) {
      console.error("[PerplexityClient] Failed to parse AI response:", err);
      throw new Error("Failed to parse intelligence response.");
    }
  }
}
