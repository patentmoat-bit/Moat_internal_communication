import OpenAI from "openai";

/**
 * Single server-side OpenAI client for the whole app.
 *
 * The platform standardizes on OpenAI (the only configured provider). The key is
 * read from OPENAI_API_KEY and never exposed to the browser — every caller of this
 * module must run on the server (route handlers / server actions).
 */
const apiKey = process.env.OPENAI_API_KEY || "";

export const hasOpenAIKey = apiKey.trim().length > 0 && !apiKey.includes("dummy");

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAIKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}
