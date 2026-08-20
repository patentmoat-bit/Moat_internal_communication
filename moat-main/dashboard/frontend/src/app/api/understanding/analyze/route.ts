import { NextResponse } from "next/server";

const domainKeywords: Record<string, string[]> = {
  "Artificial Intelligence": ["model", "neural", "machine learning", "classification", "prediction", "training", "inference"],
  "Biotechnology": ["cell", "protein", "gene", "biomarker", "assay", "therapeutic", "molecule"],
  "Electronics": ["circuit", "sensor", "signal", "processor", "voltage", "semiconductor", "module"],
  "Communications": ["network", "wireless", "packet", "protocol", "transmission", "receiver", "antenna"],
  "Mechanical Systems": ["housing", "actuator", "valve", "gear", "shaft", "assembly", "fluid"],
  "Medical Devices": ["patient", "catheter", "implant", "diagnostic", "wearable", "monitoring", "physiological"],
  "Energy Storage": ["battery", "electrode", "electrolyte", "charging", "cell", "thermal", "power"],
  "Software Systems": ["server", "database", "workflow", "interface", "application", "api", "data pipeline"],
};

const componentWords = ["sensor", "processor", "controller", "module", "engine", "interface", "database", "memory", "actuator", "circuit", "model", "network", "display", "housing"];
const differentiatorHints = ["novel", "improved", "adaptive", "real-time", "low power", "secure", "automated", "dynamic", "optimized", "reduced", "increased", "without", "unlike"];

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 16000);
}

function sentences(text: string) {
  return text.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter((item) => item.length > 30).slice(0, 12);
}

function shorten(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trim()}...`;
}

function domains(text: string) {
  const lower = text.toLowerCase();
  const scored = Object.entries(domainKeywords)
    .map(([name, words]) => ({ name, hits: words.filter((word) => lower.includes(word)).length, total: words.length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5)
    .map((item) => ({ name: item.name, confidence: Math.min(0.95, Number((0.45 + item.hits / item.total).toFixed(2))) }));
  return scored.length ? scored : [{ name: "General Engineering", confidence: 0.45 }];
}

function componentFunction(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("sensor")) return "Captures operating, physical, electrical, image, or state information.";
  if (lower.includes("processor") || lower.includes("controller") || lower.includes("engine")) return "Executes the invention's decision, control, or analysis logic.";
  if (lower.includes("database") || lower.includes("memory")) return "Stores measurements, reference data, configuration, or learned state.";
  if (lower.includes("interface") || lower.includes("network")) return "Exchanges data or commands with external systems or users.";
  if (lower.includes("actuator")) return "Converts control decisions into physical action.";
  return "Performs a core role in the invention's technical workflow.";
}

function components(text: string) {
  const lower = text.toLowerCase();
  const found = componentWords
    .filter((word) => lower.includes(word))
    .slice(0, 8)
    .map((word) => ({ name: word[0].toUpperCase() + word.slice(1), function: componentFunction(word), evidence: word }));
  return found.length ? found : [
    { name: "Input interface", function: "Receives invention data, materials, signals, or user instructions.", evidence: null },
    { name: "Processing module", function: "Transforms inputs into technical decisions or outputs.", evidence: null },
    { name: "Output module", function: "Provides a controlled action, result, display, or downstream signal.", evidence: null },
  ];
}

function differentiators(text: string) {
  const picked = sentences(text).filter((sentence) => differentiatorHints.some((hint) => sentence.toLowerCase().includes(hint))).slice(0, 5);
  const source = picked.length ? picked : sentences(text).slice(0, 3);
  return source.length ? source.map((sentence) => ({
    differentiator: shorten(sentence, 130),
    why_it_matters: "This may distinguish the invention through performance, automation, integration, reliability, or implementation constraints.",
  })) : [{ differentiator: "Integrated technical workflow", why_it_matters: "Combines components into a coordinated system-level implementation." }];
}

function localAnalyze(text: string, sourceType: string, sourceLabel: string, warnings: string[] = []) {
  const cleaned = cleanText(text || `${sourceType} input supplied for analysis.`);
  const s = sentences(cleaned);
  const d = domains(cleaned);
  const diffs = differentiators(cleaned);
  return {
    source_type: sourceType,
    source_label: sourceLabel,
    technical_summary: `This invention is primarily in ${d[0]?.name || "General Engineering"}. ${shorten(s.slice(0, 3).join(" ") || cleaned, 520)}`,
    innovation_summary: `The likely innovation centers on ${diffs.slice(0, 3).map((item) => item.differentiator).join("; ")}.`,
    core_components: components(cleaned),
    technical_domains: d,
    differentiators: diffs,
    extracted_text_preview: cleaned.slice(0, 900),
    confidence: cleaned.length > 300 ? 0.68 : 0.52,
    warnings: [...warnings, "Browser fallback analysis used because the FastAPI backend is unavailable."],
  };
}

async function proxyToBackend(formData: FormData) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000/api/v1";
  const token = formData.get("access_token")?.toString() || "demo-token";
  const response = await fetch(`${base}/understanding/analyze-file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) throw new Error(`Backend returned ${response.status}`);
  return response.json();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const inputType = formData.get("input_type")?.toString() || "text";
  const text = formData.get("text")?.toString() || "";
  const patentNumber = formData.get("patent_number")?.toString() || "";
  const file = formData.get("file");
  const warnings: string[] = [];

  try {
    const proxied = await proxyToBackend(formData);
    return NextResponse.json(proxied);
  } catch {
    let content = text;
    let label = inputType === "patent" ? patentNumber || "Patent" : inputType.toUpperCase();
    if (file instanceof File) {
      label = file.name;
      if (file.type.startsWith("text/")) {
        content = await file.text();
      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        content = text || `PDF file ${file.name} uploaded. The browser fallback cannot extract PDF internals, but will analyze any pasted context and infer invention architecture from the file label.`;
        warnings.push("PDF text extraction requires the FastAPI backend; paste key text for richer browser-only analysis.");
      } else if (file.type.startsWith("image/")) {
        content = text || `Image or diagram file ${file.name} uploaded. Analyze likely blocks, labels, interfaces, flow paths, and component roles from the visual invention artifact.`;
        warnings.push("Image OCR/vision requires the FastAPI backend; paste visible labels for richer browser-only analysis.");
      }
    }
    if (inputType === "patent" && patentNumber && !content) {
      content = `Patent ${patentNumber}. Analyze title, abstract, claims, components, technical domains, and differentiators when patent text is available.`;
      warnings.push("Patent lookup requires the FastAPI backend; paste patent abstract/claims for browser-only analysis.");
    }
    return NextResponse.json(localAnalyze(content, inputType, label, warnings));
  }
}
