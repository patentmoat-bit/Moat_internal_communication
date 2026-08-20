import { getOpenAI, OPENAI_MODEL } from "./openai";

/**
 * Extract a JSON object from a model response that may be wrapped in prose or
 * ```json fences. Returns null if nothing parseable is found — callers decide
 * how to fall back rather than throwing.
 */
export function parseJsonLoose<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let text = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Run a single-shot completion that is expected to return JSON, and parse it.
 *
 * Returns null when the provider is unconfigured, the call fails, or the output
 * can't be parsed. This keeps every feature degradable to a local fallback.
 */
export async function completeJSON<T = unknown>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "";
    return parseJsonLoose<T>(raw);
  } catch (err) {
    console.warn("[llm] completeJSON failed:", (err as Error)?.message);
    return null;
  }
}
