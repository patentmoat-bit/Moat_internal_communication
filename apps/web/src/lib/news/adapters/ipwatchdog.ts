import { NewsSourceAdapter, RawNewsItem } from "../types";
import { parseFeedXml } from "../parser";

export class IpWatchdogAdapter implements NewsSourceAdapter {
  readonly id = "ipwatchdog";
  readonly name = "IPWatchdog";
  readonly sourceUrl = "https://ipwatchdog.com";
  readonly defaultJurisdiction = "United States";
  readonly defaultCategory = "Legal / Regulatory";

  private readonly feedUrl = "https://ipwatchdog.com/feed/";

  async fetch(): Promise<RawNewsItem[]> {
    const res = await fetch(this.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MOAT-CEO/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`IPWatchdog feed returned HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items = parseFeedXml(xml, "https://ipwatchdog.com");

    return items.map((item) => ({
      ...item,
      categoryHint: "Legal / Regulatory",
      jurisdictionHint: "United States",
    }));
  }
}
