import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/app/api/trademarks/local_db.json');

export interface Trademark {
  id: string;
  type: 'word' | 'logo';
  name: string;
  application_number: string;
  status: string;
  class: string;
  goods_services: string;
  country: string;
  image_url: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const SEED_DATA: Trademark[] = [
  {
    id: "1",
    type: "word",
    name: "MOAT",
    application_number: "TM-94021-A",
    status: "Approved",
    class: "Class 42 (SaaS)",
    goods_services: "SaaS platform for patent intelligence and analytics",
    country: "US, EU, CN",
    image_url: "",
    metadata: { renewal: "2030-05-12" },
    created_at: "2020-05-12T00:00:00.000Z",
    updated_at: "2020-05-12T00:00:00.000Z"
  },
  {
    id: "2",
    type: "word",
    name: "MOAT Intelligence",
    application_number: "TM-94285-B",
    status: "Approved",
    class: "Class 9, 42",
    goods_services: "AI-based intelligence tools and patent search software",
    country: "US, EU",
    image_url: "",
    metadata: { renewal: "2031-08-19" },
    created_at: "2021-08-19T00:00:00.000Z",
    updated_at: "2021-08-19T00:00:00.000Z"
  },
  {
    id: "3",
    type: "word",
    name: "ZYRA",
    application_number: "TM-95301-C",
    status: "Pending",
    class: "Class 42 (AI Engine)",
    goods_services: "AI core engine for automated patent drafting and translation",
    country: "US",
    image_url: "",
    metadata: { renewal: "Pending" },
    created_at: "2023-11-04T00:00:00.000Z",
    updated_at: "2023-11-04T00:00:00.000Z"
  },
  {
    id: "4",
    type: "word",
    name: "MOAT Shield",
    application_number: "TM-96104-D",
    status: "Approved",
    class: "Class 38 (Telecom)",
    goods_services: "Secure communications and encrypted data storage for patent ideas",
    country: "US, EU",
    image_url: "",
    metadata: { renewal: "2032-03-22" },
    created_at: "2022-03-22T00:00:00.000Z",
    updated_at: "2022-03-22T00:00:00.000Z"
  },
  {
    id: "5",
    type: "word",
    name: "MOAT Copilot",
    application_number: "TM-97214-E",
    status: "Pending",
    class: "Class 9 (Software)",
    goods_services: "Interactive AI patent assistant and automated novelty analyst",
    country: "US, EU, JP",
    image_url: "",
    metadata: { renewal: "Pending" },
    created_at: "2024-01-15T00:00:00.000Z",
    updated_at: "2024-01-15T00:00:00.000Z"
  },
  {
    id: "6",
    type: "word",
    name: "MOAT Patent OS",
    application_number: "TM-97881-F",
    status: "Rejected",
    class: "Class 42 (IT Platform)",
    goods_services: "Integrated operating system for enterprise innovation teams",
    country: "EU",
    image_url: "",
    metadata: { renewal: "Pending" },
    created_at: "2023-09-08T00:00:00.000Z",
    updated_at: "2023-09-08T00:00:00.000Z"
  }
];

function ensureFileExists() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
  }
}

export function readTrademarks(): Trademark[] {
  ensureFileExists();
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return SEED_DATA;
  }
}

export function writeTrademarks(data: Trademark[]) {
  ensureFileExists();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
