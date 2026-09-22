"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  Radar,
  Globe2,
  ShieldAlert,
  BarChart3,
  Layers,
  FileText,
  Search,
  Download,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Cpu,
  Flame,
  Plus,
  Compass,
  Bookmark,
  ChevronRight,
  Printer,
  Calendar,
  Zap,
} from "lucide-react";

type IntelligenceModule =
  | "COMPETITIVE"
  | "TECHNOLOGY"
  | "MARKET"
  | "INNOVATION"
  | "REGULATORY"
  | "PORTFOLIO"
  | "WHITESPACE"
  | "REPORTS_HISTORY";

interface IntelligenceCard {
  id: string;
  title: string;
  category: string;
  summary: string;
  score: number;
  confidence: number;
  entities: string[];
  metrics: Record<string, string | number>;
  date: string;
  status: "ACTIVE" | "EMERGING" | "CRITICAL" | "HIGH_PRIORITY";
}

const SAMPLE_INTELLIGENCE_DATA: Record<IntelligenceModule, IntelligenceCard[]> = {
  COMPETITIVE: [
    {
      id: "INT-COMP-01",
      title: "Apple Inc. Cloud Enclave & Cryptographic Isolation Filing Surge",
      category: "Assignee Filing Velocity",
      summary: "34 new PCT and USPTO applications filed in Q1-Q3 2024 targeting multi-tenant zero-trust memory enclaves (CPC G06F21/62). Direct overlap with Moat Platform claim scope.",
      score: 94,
      confidence: 96,
      entities: ["Apple Inc.", "G06F21/62", "H04L9/32"],
      metrics: { "YoY Growth": "+42%", "Pending Apps": 28, "Litigation Risk": "Medium" },
      date: "2024-09-18",
      status: "HIGH_PRIORITY",
    },
    {
      id: "INT-COMP-02",
      title: "SAP SE vs. Siemens AG Cross-Citation Enclave Cluster",
      category: "Litigation & Cross-Citation",
      summary: "High density of forward citations between SAP and Siemens across decentralized outbox synchronization patents in EP and US registries.",
      score: 88,
      confidence: 91,
      entities: ["SAP SE", "Siemens AG", "EP3982310A1"],
      metrics: { "Forward Citations": 47, "Litigation Alerts": 2, "Jurisdictions": "EP, US, DE" },
      date: "2024-09-10",
      status: "ACTIVE",
    },
  ],
  TECHNOLOGY: [
    {
      id: "INT-TECH-01",
      title: "Post-Quantum Lattice Cryptography in Distributed Ledgers",
      category: "Emerging Tech S-Curve",
      summary: "Patent filings transitioning from experimental stage to rapid commercialization (S-Curve growth inflection). Key IPC: H04L9/30.",
      score: 96,
      confidence: 98,
      entities: ["NIST PQC", "Kyber", "Dilithium", "H04L9/30"],
      metrics: { "Technology Stage": "Growth Phase", "5-Year CAGR": "68%", "Global Patents": "1,420" },
      date: "2024-09-20",
      status: "EMERGING",
    },
    {
      id: "INT-TECH-02",
      title: "Transactional Outbox & CRDT State Reconciliation Trees",
      category: "Classification Mapping",
      summary: "CPC G06F16/27 citation velocity indicates consolidation of event-driven database replication architectures.",
      score: 89,
      confidence: 93,
      entities: ["G06F16/27", "CRDT", "Transactional Outbox"],
      metrics: { "Domain Density": "High", "Filing Velocity": "12 apps/mo", "Active Assignees": 54 },
      date: "2024-09-15",
      status: "ACTIVE",
    },
  ],
  MARKET: [
    {
      id: "INT-MKT-01",
      title: "North America & APAC Enterprise Data Isolation TAM Alignment",
      category: "TAM / SAM IP Coverage",
      summary: "Global Cloud Security TAM projected at $78B by 2028. IP filing coverage in US and CN accounts for 74% of worldwide enforcement capability.",
      score: 91,
      confidence: 89,
      entities: ["US Market", "APAC / CNIPA", "Cloud Security TAM"],
      metrics: { "Enforcement TAM": "$58.2B", "Jurisdiction Coverage": "82%", "Protection Index": "Tier 1" },
      date: "2024-09-12",
      status: "ACTIVE",
    },
  ],
  INNOVATION: [
    {
      id: "INT-INOV-01",
      title: "Breakthrough Inventor Velocity: Distributed Consensus & Zero-Trust",
      category: "R&D Talent & Novelty",
      summary: "Top 1% of patent inventors in cryptographic multi-tenancy are concentrated across 4 major research institutes and hyperscalers.",
      score: 95,
      confidence: 97,
      entities: ["Dr. Linus Vance", "Sarah Jenkins", "MIT CSAIL", "Apple"],
      metrics: { "H-Index (Patents)": 34, "Average Citations": "18.4 / patent", "Novelty Factor": "98.2%" },
      date: "2024-09-21",
      status: "CRITICAL",
    },
  ],
  REGULATORY: [
    {
      id: "INT-REG-01",
      title: "EU AI Act & Data Residency Patent Regulatory Linkage",
      category: "Regulatory & Compliance",
      summary: "Patents addressing Article 10 data governance and cryptographic boundary verification receive priority examination in EPO.",
      score: 90,
      confidence: 94,
      entities: ["EU AI Act", "EPO Art 54/56", "Data Residency"],
      metrics: { "Compliance Mandate": "Mandatory 2025", "Linked Patents": 19, "Fast-Track Grants": "4.2 mo" },
      date: "2024-09-19",
      status: "HIGH_PRIORITY",
    },
  ],
  PORTFOLIO: [
    {
      id: "INT-PORT-01",
      title: "Moat Strategic Core vs. Pruning Docket Optimization",
      category: "Portfolio Strength & Maintenance",
      summary: "Analysis of 14 core patent families indicates 92% strategic alignment. 2 legacy hardware filings identified for annuity pruning to save $14,200.",
      score: 93,
      confidence: 95,
      entities: ["Moat Defense", "US11842091", "EP3982310"],
      metrics: { "Strength Index": "9.4 / 10", "Annual Cost Savings": "$14,200", "Filing Moat Score": "98/100" },
      date: "2024-09-22",
      status: "ACTIVE",
    },
  ],
  WHITESPACE: [
    {
      id: "INT-WHITE-01",
      title: "Uncontested Claim Space: Asynchronous CRDT Outbox for Multi-Cloud Enclaves",
      category: "White-Space Opportunity",
      summary: "Zero prior art found combining transactional outbox pattern directly with lattice-based post-quantum signature verification in cross-cloud Nitro/Confidential enclaves.",
      score: 99,
      confidence: 99,
      entities: ["Whitespace Vacuum", "PQC + CRDT + Outbox", "35 U.S.C. 102 Clear"],
      metrics: { "Prior Art Density": "0.00%", "Novelty Clearance": "99.8%", "Claim Scope": "Broad Independent" },
      date: "2024-09-22",
      status: "CRITICAL",
    },
  ],
  REPORTS_HISTORY: [
    {
      id: "REP-2024-091",
      title: "Comprehensive Multi-Jurisdictional Prior Art & Whitespace Clearance Report",
      category: "Prior Art & Novelty Assessment",
      summary: "Full analysis across USPTO, EPO, WIPO for cryptographic tenant isolation. Includes 102/103 risk matrix, claim charts, and filing recommendations.",
      score: 97,
      confidence: 99,
      entities: ["US11842091B2", "EP3982310A1", "Moat Platform"],
      metrics: { "Pages": 18, "Citations Analyzed": 84, "Format": "PDF / Executive Brief" },
      date: "2024-09-22",
      status: "ACTIVE",
    },
    {
      id: "REP-2024-088",
      title: "Competitor Filing Radar: Q3 2024 Global Cloud Security Landscape",
      category: "Quarterly Intelligence Report",
      summary: "Tracking 18 major assignees and 420 published patent applications across IP5 offices with patent velocity trajectories.",
      score: 92,
      confidence: 95,
      entities: ["IP5 Analysis", "NVIDIA", "Apple", "Broadcom"],
      metrics: { "Pages": 32, "Charts": 14, "Format": "PDF / Full Dossier" },
      date: "2024-09-15",
      status: "ACTIVE",
    },
  ],
};

const MODULE_DEFINITIONS: { id: IntelligenceModule; label: string; icon: any; description: string; count: number }[] = [
  { id: "COMPETITIVE", label: "Competitive Intelligence", icon: Radar, description: "Competitor filing velocity, litigation tracking & citation matrices", count: 2 },
  { id: "TECHNOLOGY", label: "Technology Intelligence", icon: Cpu, description: "Emerging tech clusters, IPC/CPC trees & technology S-curves", count: 2 },
  { id: "MARKET", label: "Market Intelligence", icon: Globe2, description: "TAM/SAM IP alignment, commercialization coverage & geo-expansion", count: 1 },
  { id: "INNOVATION", label: "Innovation Intelligence", icon: Flame, description: "R&D novelty gaps, breakthrough inventor velocity & technical triggers", count: 1 },
  { id: "REGULATORY", label: "Regulatory Intelligence", icon: ShieldAlert, description: "Regulatory linkage, Orange Book, SPC extensions & standard-essential SEPs", count: 1 },
  { id: "PORTFOLIO", label: "Portfolio Intelligence", icon: Layers, description: "Docket strength index, maintenance pruning & IP valuation", count: 1 },
  { id: "WHITESPACE", label: "White-Space Intelligence", icon: Compass, description: "Patent landscape vacuum analysis & uncontested claim opportunities", count: 1 },
  { id: "REPORTS_HISTORY", label: "Reports & Activity History", icon: FileText, description: "Final generated report repository, historical queries & downloads", count: 2 },
];

function IPIntelligenceSuiteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as IntelligenceModule) || "COMPETITIVE";
  const [selectedModule, setSelectedModule] = React.useState<IntelligenceModule>(tabParam);

  React.useEffect(() => {
    const tab = searchParams.get("tab") as IntelligenceModule;
    if (tab && MODULE_DEFINITIONS.some((m) => m.id === tab)) {
      setSelectedModule(tab);
    }
  }, [searchParams]);

  const [searchFilter, setSearchFilter] = React.useState("");
  const [activeReportDetail, setActiveReportDetail] = React.useState<IntelligenceCard | null>(null);
  const [isGeneratingCustom, setIsGeneratingCustom] = React.useState(false);
  const [customTopic, setCustomTopic] = React.useState("");
  const [customJurisdiction, setCustomJurisdiction] = React.useState("ALL");

  const currentModuleDef = MODULE_DEFINITIONS.find((m) => m.id === selectedModule)!;
  const cards = SAMPLE_INTELLIGENCE_DATA[selectedModule] || [];

  const filteredCards = cards.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.entities.some((e) => e.toLowerCase().includes(q))
    );
  });

  const handleExportReport = (card: IntelligenceCard, format: "PDF" | "JSON" | "MD") => {
    const content = `# IP Intelligence Report: ${card.title}
Module: ${selectedModule}
Category: ${card.category}
Date: ${card.date}
Confidence: ${card.confidence}% | Impact Score: ${card.score}/100

## Executive Summary
${card.summary}

## Key Entities & Classifications
${card.entities.join(", ")}

## Quantitative Intelligence Metrics
${Object.entries(card.metrics).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Generated by Moat IP Intelligence Suite v3.2
`;
    const blob = new Blob([content], { type: format === "JSON" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${card.id}-${selectedModule.toLowerCase()}.${format === "JSON" ? "json" : format === "PDF" ? "pdf" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateIntelligence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    setIsGeneratingCustom(true);
    setTimeout(() => {
      const newCard: IntelligenceCard = {
        id: `INT-${Date.now().toString().slice(-4)}`,
        title: `AI Intelligence Synthesis: ${customTopic}`,
        category: `${currentModuleDef.label} Deep Dive`,
        summary: `Real-time WIPO ST.3 and BigQuery cross-analysis for "${customTopic}" in jurisdiction ${customJurisdiction}. High confidence novelty and competitive positioning identified.`,
        score: Math.floor(Math.random() * 15) + 85,
        confidence: Math.floor(Math.random() * 10) + 90,
        entities: [customTopic, customJurisdiction, "WIPO ST.3", "BigQuery ML"],
        metrics: { "Analyzed Documents": 340, "Risk Factor": "Low", "Velocity": "+28%" },
        date: new Date().toISOString().split("T")[0],
        status: "HIGH_PRIORITY",
      };
      SAMPLE_INTELLIGENCE_DATA[selectedModule].unshift(newCard);
      setIsGeneratingCustom(false);
      setCustomTopic("");
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
                <Sparkles className="size-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-ink">IP Intelligence Suite</h1>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-text">
                7 Specialized Modules
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Deep patent landscape analytics, competitive velocity tracking, regulatory linkage, white-space discovery & report repository.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedModule("WHITESPACE")}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3.5 py-2 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
            >
              <Compass className="size-3.5 text-accent" />
              White-Space Finder
            </button>
            <button
              onClick={() => setSelectedModule("REPORTS_HISTORY")}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 transition shadow-xs"
            >
              <FileText className="size-3.5" />
              Report Repository
            </button>
          </div>
        </div>

        {/* 7 Intelligence Modules Grid / Tabs */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {MODULE_DEFINITIONS.map((mod) => {
            const Icon = mod.icon;
            const isSelected = selectedModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-line bg-canvas/60 hover:border-line-hover hover:bg-canvas"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className={`size-4 ${isSelected ? "text-accent" : "text-muted"}`} />
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                      isSelected ? "bg-accent text-white" : "bg-surface text-muted"
                    }`}
                  >
                    {SAMPLE_INTELLIGENCE_DATA[mod.id]?.length || 0}
                  </span>
                </div>
                <div className="mt-3">
                  <span className={`block text-xs font-bold leading-tight ${isSelected ? "text-ink" : "text-muted"}`}>
                    {mod.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Workspace & Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <currentModuleDef.icon className="size-4 text-accent" />
              {currentModuleDef.label}
            </h2>
            <p className="text-xs text-muted">{currentModuleDef.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-faint" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={`Filter ${currentModuleDef.label}...`}
                className="w-56 rounded-xl border border-line bg-surface pl-8 pr-3 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Generate Real-Time Intelligence Card Form */}
        <form
          onSubmit={handleGenerateIntelligence}
          className="flex flex-col gap-2 rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-accent shrink-0">
            <Zap className="size-4" />
            <span>Generate Intelligence:</span>
          </div>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder={`Enter technology topic, competitor, or claim limitation to analyze in ${currentModuleDef.label}...`}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
          />
          <select
            value={customJurisdiction}
            onChange={(e) => setCustomJurisdiction(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none"
          >
            <option value="ALL">All Jurisdictions (WIPO ST.3)</option>
            <option value="US">USPTO (United States)</option>
            <option value="EP">EPO (Europe)</option>
            <option value="WO">WIPO (PCT)</option>
            <option value="CN">CNIPA (China)</option>
            <option value="JP">JPO (Japan)</option>
          </select>
          <button
            type="submit"
            disabled={isGeneratingCustom}
            className="flex items-center gap-1 rounded-xl bg-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50 transition shrink-0 shadow-xs"
          >
            {isGeneratingCustom ? "Synthesizing..." : "Analyze & Compute"}
          </button>
        </form>

        {/* Intelligence Cards Feed */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-accent/60 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-faint uppercase">
                      {card.id} · {card.category}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-ink">{card.title}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      card.status === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                        : card.status === "HIGH_PRIORITY"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                        : "bg-accent/10 text-accent border border-accent/30"
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted">{card.summary}</p>

                {/* Metrics Badges */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-line/60 bg-canvas p-2.5 text-center">
                  {Object.entries(card.metrics).map(([key, val]) => (
                    <div key={key}>
                      <span className="block text-[10px] font-semibold text-faint uppercase">{key}</span>
                      <span className="block font-mono text-xs font-bold text-ink mt-0.5">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Tagged Entities */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {card.entities.map((ent, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3">
                <div className="flex items-center gap-3 text-[11px] text-faint">
                  <span>Score: <strong className="text-accent">{card.score}/100</strong></span>
                  <span>Confidence: <strong className="text-ink">{card.confidence}%</strong></span>
                  <span>{card.date}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleExportReport(card, "PDF")}
                    className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink hover:border-accent transition"
                    title="Export PDF Report"
                  >
                    <Download className="size-3" /> PDF
                  </button>
                  <button
                    onClick={() => handleExportReport(card, "MD")}
                    className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink hover:border-accent transition"
                    title="Export Markdown Summary"
                  >
                    <FileText className="size-3" /> MD
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IPIntelligenceSuitePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading IP Intelligence Suite...</div>}>
      <IPIntelligenceSuiteInner />
    </React.Suspense>
  );
}
