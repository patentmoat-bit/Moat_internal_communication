/**
 * Helpers shared by the novelty and FTO analysis engines. Deterministic so the
 * mock fallback is stable for a given query (no random churn between renders).
 */

const ASSIGNEES = [
  "Medtronic plc",
  "Abbott Laboratories",
  "Samsung Electronics",
  "Koninklijke Philips",
  "Dexcom Inc.",
  "Apple Inc.",
  "Siemens Healthineers",
  "Roche Diagnostics",
  "Boston Scientific",
  "General Electric",
];

const JURISDICTIONS = ["US", "EP", "WO", "JP", "CN"];

/** Stable 32-bit hash of a string — drives all deterministic mock choices. */
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Pick a deterministic element from a list using a seed. */
export function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length];
}

/** Build a plausible, well-formatted patent number from a seed. */
export function mockPatentNumber(seed: number): string {
  const jur = pick(JURISDICTIONS, seed);
  if (jur === "US") return `US${10_000_000 + (seed % 1_500_000)}B2`;
  if (jur === "EP") return `EP${3_000_000 + (seed % 700_000)}A1`;
  if (jur === "WO") return `WO20${15 + (seed % 9)}/${100000 + (seed % 800000)}`;
  if (jur === "JP") return `JP${6_000_000 + (seed % 900_000)}B2`;
  return `CN${110_000_000 + (seed % 9_000_000)}A`;
}

export function mockAssignee(seed: number): string {
  return pick(ASSIGNEES, seed);
}

export function mockJurisdiction(seed: number): string {
  return pick(JURISDICTIONS, seed);
}

export function mockYear(seed: number): number {
  return 2012 + (seed % 12);
}

/** Split the comma-joined `concepts` query param into clean technology names. */
export function parseConcepts(concepts?: string | null): string[] {
  if (!concepts) return [];
  return concepts
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Title-case a concept for use inside a generated patent title. */
export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
