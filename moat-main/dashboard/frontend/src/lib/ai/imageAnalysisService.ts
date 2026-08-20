import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";

export interface ImageAnalysisResult {
  summary: string;
  detectedElements: string[];
  patentRelevance: string;
  source: "vision" | "fallback";
}

export class ImageAnalysisService {
  async analyze(input: { imageUrl?: string; caption?: string; context?: string }): Promise<ImageAnalysisResult> {
    const openai = getOpenAI();
    if (openai && input.imageUrl) {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          max_tokens: 700,
          temperature: 0.2,
          messages: [
            { role: "system", content: "Analyze patent drawings or technical images. Return concise JSON with summary, detectedElements, and patentRelevance." },
            {
              role: "user",
              content: [
                { type: "text", text: input.context || input.caption || "Analyze this patent/technical image." },
                { type: "image_url", image_url: { url: input.imageUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
        return {
          summary: parsed.summary || "Image analyzed.",
          detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements : [],
          patentRelevance: parsed.patentRelevance || "Relevant to technical disclosure review.",
          source: "vision",
        };
      } catch (err) {
        console.warn("[image-analysis] vision failed:", (err as Error).message);
      }
    }

    const terms = `${input.caption || ""} ${input.context || ""}`.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
    return {
      summary: input.caption || "Image analysis requires a configured vision model or extracted drawing text.",
      detectedElements: [...new Set(terms)].slice(0, 8),
      patentRelevance: "Fallback analysis based on caption/context text only.",
      source: "fallback",
    };
  }
}

export const imageAnalysisService = new ImageAnalysisService();
