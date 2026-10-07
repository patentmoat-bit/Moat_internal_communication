import { RawNewsItem } from "./types";

export function parseFeedXml(xml: string, defaultLinkPrefix = ""): RawNewsItem[] {
  const items: RawNewsItem[] = [];

  // 1. Try RSS <item>
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[0];
    const title = extractTag(raw, "title");
    let link = extractTag(raw, "link");
    if (!link) {
      const guidPerma = raw.match(/<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/i);
      link = guidPerma ? guidPerma[1].trim() : "";
    }
    const guid = extractTag(raw, "guid") || link;
    const pubDateStr = extractTag(raw, "pubDate") || extractTag(raw, "dc:date") || "";
    const description = extractTag(raw, "description");
    const content = extractTag(raw, "content:encoded") || description;
    const author = extractTag(raw, "dc:creator") || extractTag(raw, "author") || null;

    if (title && (link || guid)) {
      items.push({
        title,
        link: link || guid,
        externalId: guid || link,
        pubDateStr,
        description,
        content,
        author,
      });
    }
  }

  // 2. Try Atom <entry> if no RSS items found
  if (items.length === 0) {
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const raw = match[0];
      const title = extractTag(raw, "title");
      
      const linkMatch = raw.match(/<link[^>]*href="([^"]+)"[^>]*>/i);
      let link = linkMatch ? linkMatch[1].trim() : extractTag(raw, "link");
      if (link.startsWith("/") && defaultLinkPrefix) {
        link = defaultLinkPrefix + link;
      }
      
      const id = extractTag(raw, "id") || link;
      const pubDateStr = extractTag(raw, "published") || extractTag(raw, "updated") || "";
      const summary = extractTag(raw, "summary");
      const content = extractTag(raw, "content") || summary;
      const author = extractTag(raw, "name") || null;

      if (title && (link || id)) {
        items.push({
          title,
          link: link || id,
          externalId: id || link,
          pubDateStr,
          description: summary,
          content,
          author,
        });
      }
    }
  }

  return items;
}

function extractTag(xmlSnippet: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tagName}>`, "i");
  const match = xmlSnippet.match(regex);
  if (!match) return "";
  return match[1].trim();
}
