export interface Trademark {
  id: string;
  type: "word" | "logo";
  name: string;
  application_number?: string;
  status: string;
  class?: string;
  goods_services?: string;
  country?: string;
  image_url?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  files?: TrademarkFile[];
}

export interface TrademarkHistory {
  id: string;
  trademark_id: string;
  action: string;
  performed_by: string;
  timestamp: string;
}

export interface TrademarkFile {
  id: string;
  trademark_id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  created_at: string;
}
