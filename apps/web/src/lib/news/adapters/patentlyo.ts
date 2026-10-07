import { NewsSourceAdapter, RawNewsItem } from "../types";
import { parseFeedXml } from "../parser";

export class PatentlyOAdapter implements NewsSourceAdapter {
  readonly id = "patentlyo";
  readonly name = "Patently-O";
  readonly sourceUrl = "https://patentlyo.com";
  readonly defaultJurisdiction = "United States";
  readonly defaultCategory = "Patents";

  private readonly feedUrl = "https://patentlyo.com/feed";

  async fetch(): Promise<RawNewsItem[]> {
    const res = await fetch(this.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MOAT-CEO/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Patently-O feed returned HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items = parseFeedXml(xml, "https://patentlyo.com");

    return items.map((item) => ({
      ...item,
      categoryHint: "Patents",
      jurisdictionHint: "United States",
    }));
  }
}
