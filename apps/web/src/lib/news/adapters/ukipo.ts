import { NewsSourceAdapter, RawNewsItem } from "../types";
import { parseFeedXml } from "../parser";

export class UkIpoAdapter implements NewsSourceAdapter {
  readonly id = "ukipo";
  readonly name = "UK IPO";
  readonly sourceUrl = "https://www.gov.uk/government/organisations/intellectual-property-office";
  readonly defaultJurisdiction = "United Kingdom";
  readonly defaultCategory = "Patent Offices";

  private readonly feedUrl = "https://www.gov.uk/government/organisations/intellectual-property-office.atom";

  async fetch(): Promise<RawNewsItem[]> {
    const res = await fetch(this.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MOAT-CEO/1.0",
        "Accept": "application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`UK IPO feed returned HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items = parseFeedXml(xml, "https://www.gov.uk");

    return items.map((item) => ({
      ...item,
      categoryHint: "Patent Offices",
      jurisdictionHint: "United Kingdom",
    }));
  }
}
