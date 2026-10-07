import { NewsSourceAdapter, RawNewsItem } from "../types";
import { parseFeedXml } from "../parser";

export class UsptoAdapter implements NewsSourceAdapter {
  readonly id = "uspto";
  readonly name = "USPTO";
  readonly sourceUrl = "https://www.uspto.gov";
  readonly defaultJurisdiction = "United States";
  readonly defaultCategory = "Patent Offices";

  private readonly feedUrl = "https://data.uspto.gov/ptab-feed/notifications.rss";

  async fetch(): Promise<RawNewsItem[]> {
    const res = await fetch(this.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MOAT-CEO/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`USPTO PTAB feed returned HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items = parseFeedXml(xml, "https://www.uspto.gov");

    return items.map((item) => ({
      ...item,
      categoryHint: "Patent Offices",
      jurisdictionHint: "United States",
    }));
  }
}
