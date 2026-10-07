import { NewsSourceAdapter, RawNewsItem } from "../types";
import { parseFeedXml } from "../parser";

export class WipoAdapter implements NewsSourceAdapter {
  readonly id = "wipo";
  readonly name = "WIPO";
  readonly sourceUrl = "https://www.wipo.int";
  readonly defaultJurisdiction = "International";
  readonly defaultCategory = "International IP";

  private readonly feedUrl = "https://www.wipo.int/pressroom/en/rss.xml";

  async fetch(): Promise<RawNewsItem[]> {
    const res = await fetch(this.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MOAT-CEO/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`WIPO feed returned HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items = parseFeedXml(xml, "https://www.wipo.int");

    return items.map((item) => ({
      ...item,
      categoryHint: "International IP",
      jurisdictionHint: "International",
    }));
  }
}
