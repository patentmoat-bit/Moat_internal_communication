export interface RawNewsItem {
  title: string;
  link: string;
  externalId: string;
  pubDateStr: string;
  description: string;
  content?: string;
  author?: string | null;
  categoryHint?: string;
  jurisdictionHint?: string;
}

export interface NewsSourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly sourceUrl: string;
  readonly defaultJurisdiction: string;
  readonly defaultCategory: string;
  fetch(): Promise<RawNewsItem[]>;
}
