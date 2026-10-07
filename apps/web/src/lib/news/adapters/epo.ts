import { NewsSourceAdapter, RawNewsItem } from "../types";
import { parseFeedXml } from "../parser";

export class EpoAdapter implements NewsSourceAdapter {
  readonly id = "epo";
  readonly name = "EPO";
  readonly sourceUrl = "https://www.epo.org";
  readonly defaultJurisdiction = "Europe";
  readonly defaultCategory = "Patent Offices";

  private readonly feedUrls = [
    "https://www.epo.org/en/news-events/news/feed",
    "https://www.epo.org/en/law-and-practice/boards-of-appeal/communications/feed",
  ];

  async fetch(): Promise<RawNewsItem[]> {
    const allItems: RawNewsItem[] = [];

    for (const url of this.feedUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MOAT-CEO/1.0",
            "Accept": "application/rss+xml, application/xml, text/xml",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const xml = await res.text();
          const items = parseFeedXml(xml, "https://www.epo.org");
          allItems.push(
            ...items.map((it) => ({
              ...it,
              categoryHint: url.includes("boards-of-appeal") ? "Legal / Regulatory" : "Patent Offices",
              jurisdictionHint: "Europe",
            }))
          );
        }
      } catch (err) {
        console.warn(`[EPO Adapter] Warning fetching ${url}:`, err);
      }
    }

    if (allItems.length === 0) {
      throw new Error("Failed to fetch any articles from EPO feeds");
    }

    return allItems;
  }
}
