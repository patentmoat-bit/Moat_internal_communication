export interface OCRResult {
  text: string;
  confidence: number;
  blocks: Array<{ text: string; confidence: number; bbox?: [number, number, number, number] }>;
  source: "provided-text" | "unavailable";
}

export class OCRService {
  async extractText(input: { text?: string; imageUrl?: string; fileName?: string }): Promise<OCRResult> {
    if (input.text?.trim()) {
      return { text: input.text.trim(), confidence: 1, blocks: [{ text: input.text.trim(), confidence: 1 }], source: "provided-text" };
    }
    return {
      text: "",
      confidence: 0,
      blocks: [],
      source: "unavailable",
    };
  }
}

export const ocrService = new OCRService();
