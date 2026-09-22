"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Award,
  Search,
  UploadCloud,
  FolderPlus,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  Eye,
  Sparkles,
} from "lucide-react";

type TrademarkTab = "WORD_SEARCH" | "LOGO_SEARCH" | "UPLOAD_REVIEW" | "PROJECT_STORAGE" | "REMINDERS_DOCKET";

interface TrademarkRecord {
  id: string;
  serial_number: string;
  registration_number?: string;
  mark_name: string;
  mark_type: "WORD" | "LOGO" | "COMBINED";
  nice_classes: string[];
  owner: string;
  status: "LIVE / REGISTERED" | "PENDING_EXAMINATION" | "OPPOSITION_PERIOD" | "RENEWAL_DUE";
  filing_date: string;
  registration_date?: string;
  next_deadline: string;
  deadline_type: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  similarity_score?: number;
}

const INITIAL_TRADEMARKS: TrademarkRecord[] = [
  {
    id: "TM-01",
    serial_number: "97843210",
    registration_number: "7128945",
    mark_name: "MOAT DEFENSE",
    mark_type: "WORD",
    nice_classes: ["Class 042 - Software as a Service (SaaS)", "Class 045 - IP Legal Intelligence"],
    owner: "Moat IP Global Inc.",
    status: "LIVE / REGISTERED",
    filing_date: "2023-04-10",
    registration_date: "2024-01-16",
    next_deadline: "2029-01-16",
    deadline_type: "Section 8 & 15 Affidavit of Incontestability",
    risk_level: "LOW",
    similarity_score: 12,
  },
  {
    id: "TM-02",
    serial_number: "98129034",
    mark_name: "SHIELDMOAT",
    mark_type: "WORD",
    nice_classes: ["Class 042 - Computer Security Software"],
    owner: "CyberShield Technologies LLC",
    status: "PENDING_EXAMINATION",
    filing_date: "2024-02-18",
    next_deadline: "2024-11-18",
    deadline_type: "Response to First Office Action",
    risk_level: "HIGH",
    similarity_score: 86,
  },
  {
    id: "TM-03",
    serial_number: "98542109",
    mark_name: "PATENTMOAT NEXUS",
    mark_type: "COMBINED",
    nice_classes: ["Class 009 - Downloadable AI Software", "Class 035 - Business IP Management"],
    owner: "Moat IP Global Inc.",
    status: "OPPOSITION_PERIOD",
    filing_date: "2023-11-05",
    next_deadline: "2024-10-30",
    deadline_type: "30-Day Publication for Opposition End",
    risk_level: "MEDIUM",
    similarity_score: 34,
  },
];

function TrademarksSuiteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as TrademarkTab) || "WORD_SEARCH";
  const [activeTab, setActiveTab] = React.useState<TrademarkTab>(tabParam);

  React.useEffect(() => {
    const tab = searchParams.get("tab") as TrademarkTab;
    if (
      tab &&
      ["WORD_SEARCH", "LOGO_SEARCH", "UPLOAD_REVIEW", "PROJECT_STORAGE", "REMINDERS_DOCKET"].includes(tab)
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [niceClassFilter, setNiceClassFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [trademarks, setTrademarks] = React.useState<TrademarkRecord[]>(INITIAL_TRADEMARKS);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<TrademarkRecord | null>(null);

  // New Upload Specimen State
  const [uploadedFileName, setUploadedFileName] = React.useState<string | null>(null);
  const [viennaClassification, setViennaClassification] = React.useState<string>("");
  const [specimenNotes, setSpecimenNotes] = React.useState<string>("");
  const [analysisResult, setAnalysisResult] = React.useState<any>(null);

  const handleWordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 400);
  };

  const handleUploadSpecimen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisResult({
          mark_detected: "MOAT HEXAGON EMBLEM",
          vienna_codes: ["26.04.02 - Hexagons", "24.01.05 - Shields containing representations of geometric figures"],
          conflicts: [
            { name: "HEXAMARK SECURITY", score: 62, owner: "Hexa Systems Inc", status: "REGISTERED" },
            { name: "MOAT GUARD", score: 41, owner: "Guard Corp", status: "PENDING" },
          ],
          clearance_recommendation: "PROCEED WITH REGISTRATION - LOW LIKELIHOOD OF CONFUSION (Class 42)",
        });
      }, 700);
    }
  };

  const handleSaveDocket = (tm: TrademarkRecord) => {
    alert(`Mark ${tm.mark_name} saved to Project Docket.`);
  };

  const filteredTrademarks = trademarks.filter((tm) => {
    if (niceClassFilter !== "ALL" && !tm.nice_classes.some((c) => c.includes(niceClassFilter))) return false;
    if (statusFilter !== "ALL" && tm.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tm.mark_name.toLowerCase().includes(q) ||
        tm.serial_number.includes(q) ||
        tm.owner.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
                <Award className="size-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-ink">Trademark Management Suite</h1>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-text">
                USPTO & Madrid System
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Word & Logo trademark search, Nice & Vienna code classification, specimen review, project docketing & statutory deadline tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("UPLOAD_REVIEW")}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3.5 py-2 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
            >
              <UploadCloud className="size-3.5 text-accent" />
              Upload Specimen
            </button>
            <button
              onClick={() => setActiveTab("REMINDERS_DOCKET")}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 transition shadow-xs"
            >
              <Clock className="size-3.5" />
              Deadlines & Renewals
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4">
          {[
            { id: "WORD_SEARCH", label: "Word Trademark Search", icon: Search },
            { id: "LOGO_SEARCH", label: "Logo & Visual Mark Search", icon: ImageIcon },
            { id: "UPLOAD_REVIEW", label: "Upload & Review Specimen", icon: UploadCloud },
            { id: "PROJECT_STORAGE", label: "Project Storage & Dockets", icon: FolderPlus },
            { id: "REMINDERS_DOCKET", label: "Deadlines & Reminders Docket", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TrademarkTab)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-accent text-white shadow-xs"
                    : "border border-line bg-canvas/60 text-muted hover:text-ink hover:bg-canvas"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Word Search */}
      {activeTab === "WORD_SEARCH" && (
        <div className="space-y-4">
          <form onSubmit={handleWordSearch} className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trademark word marks, phonetic variants, serial numbers, or owners..."
                className="w-full rounded-xl border border-line bg-surface pl-9 pr-4 py-2 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>

            <select
              value={niceClassFilter}
              onChange={(e) => setNiceClassFilter(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none"
            >
              <option value="ALL">All Nice Classes (001-045)</option>
              <option value="042">Class 042 - Software & SaaS</option>
              <option value="009">Class 009 - Downloadable Tech</option>
              <option value="035">Class 035 - Business Advertising</option>
              <option value="045">Class 045 - Legal Intelligence</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink outline-none"
            >
              <option value="ALL">All Registration Statuses</option>
              <option value="LIVE / REGISTERED">Live / Registered</option>
              <option value="PENDING_EXAMINATION">Pending Examination</option>
              <option value="OPPOSITION_PERIOD">Opposition Period</option>
            </select>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-canvas hover:bg-ink/90 transition shadow-xs"
            >
              <Search className="size-3.5" />
              {isAnalyzing ? "Scanning..." : "Clearance Search"}
            </button>
          </form>

          {/* Trademark Results Table */}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/70 font-bold uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-3">Mark & Serial #</th>
                  <th className="px-4 py-3">Nice Classes</th>
                  <th className="px-4 py-3">Owner / Applicant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Next Statutory Deadline</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredTrademarks.map((tm) => (
                  <tr key={tm.id} className="hover:bg-canvas/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-ink">{tm.mark_name}</div>
                      <div className="font-mono text-[11px] text-faint">SN: {tm.serial_number} {tm.registration_number ? `· RN: ${tm.registration_number}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      {tm.nice_classes.map((nc, idx) => (
                        <span key={idx} className="block font-medium text-muted">{nc}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-ink font-medium">{tm.owner}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          tm.status === "LIVE / REGISTERED"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                            : tm.status === "OPPOSITION_PERIOD"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            : "bg-accent/10 text-accent border border-accent/30"
                        }`}
                      >
                        {tm.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-ink">{tm.next_deadline}</div>
                      <div className="text-[11px] text-muted">{tm.deadline_type}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRecord(tm)}
                          className="rounded-lg border border-line bg-canvas p-1.5 text-muted hover:text-ink hover:border-accent transition"
                          title="View Full Details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleSaveDocket(tm)}
                          className="rounded-lg border border-line bg-canvas p-1.5 text-muted hover:text-accent hover:border-accent transition"
                          title="Add to Docket"
                        >
                          <FolderPlus className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Logo Search */}
      {activeTab === "LOGO_SEARCH" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <ImageIcon className="size-4 text-accent" />
              Vienna Classification & Visual Trademark Search
            </h3>
            <p className="text-xs text-muted">
              Analyze figurative marks, geometric device elements, and multi-color logo similarity across global trademark registers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-dashed border-accent/60 bg-accent/5 p-6 text-center space-y-3">
              <ImageIcon className="size-8 text-accent mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-ink">Upload Logo / Emblem</h4>
                <p className="text-[11px] text-muted">PNG, SVG, or JPG up to 10MB</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white hover:bg-accent/90 transition shadow-xs">
                <UploadCloud className="size-3.5" /> Select Image
                <input type="file" accept="image/*" onChange={handleUploadSpecimen} className="hidden" />
              </label>
            </div>

            <div className="col-span-2 rounded-xl border border-line bg-canvas p-5 space-y-3">
              <h4 className="text-xs font-bold text-ink">Vienna Classification Codes</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-line bg-surface p-2.5">
                  <span className="font-mono font-bold text-accent">Category 26: Geometric Figures</span>
                  <p className="text-[11px] text-muted mt-1">Circles, ellipses, polygons, hexagons, shields</p>
                </div>
                <div className="rounded-lg border border-line bg-surface p-2.5">
                  <span className="font-mono font-bold text-accent">Category 24: Heraldry & Emblems</span>
                  <p className="text-[11px] text-muted mt-1">Shields containing representations of alphanumeric marks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Upload & Review */}
      {activeTab === "UPLOAD_REVIEW" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <UploadCloud className="size-4 text-accent" />
              Trademark Specimen & Label Review Engine
            </h3>
            <p className="text-xs text-muted">
              Submit product packaging, website screenshots, or UI assets to verify statutory USPTO Specimen of Use standards (37 CFR § 2.56).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-line bg-canvas p-8 text-center space-y-3">
                <UploadCloud className="size-10 text-faint mx-auto" />
                <h4 className="text-sm font-bold text-ink">Drop Specimen or Packaging Photo</h4>
                <p className="text-xs text-muted">PDF, PNG, JPG, or DOCX</p>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 transition shadow-xs">
                  Browse Files
                  <input type="file" onChange={handleUploadSpecimen} className="hidden" />
                </label>
                {uploadedFileName && (
                  <p className="text-xs font-bold text-accent">Loaded: {uploadedFileName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Analyst Notes & Commercial Context</label>
                <textarea
                  value={specimenNotes}
                  onChange={(e) => setSpecimenNotes(e.target.value)}
                  placeholder="Describe goods/services commercial usage (e.g., SaaS landing page sign-up screen showing MOAT mark in commerce)..."
                  className="w-full rounded-xl border border-line bg-surface p-3 text-xs text-ink outline-none focus:border-accent"
                  rows={3}
                />
              </div>
            </div>

            {/* Analysis Results Panel */}
            <div className="rounded-2xl border border-line bg-canvas p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Automated Clearance & Specimen Assessment
              </h4>

              {analysisResult ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {analysisResult.clearance_recommendation}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-faint uppercase">Detected Mark:</span>
                    <p className="text-sm font-bold text-ink">{analysisResult.mark_detected}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-faint uppercase">Vienna Classification Mapping:</span>
                    <div className="mt-1 space-y-1">
                      {analysisResult.vienna_codes.map((vc: string, i: number) => (
                        <div key={i} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-mono text-ink">
                          {vc}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-faint uppercase">Closest Conflicting Marks in Registry:</span>
                    <div className="mt-1 space-y-1.5">
                      {analysisResult.conflicts.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-xs">
                          <div>
                            <span className="font-bold text-ink">{c.name}</span>
                            <span className="block text-[10px] text-faint">{c.owner} ({c.status})</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-amber-600">Similarity: {c.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-faint">
                  <ImageIcon className="size-8 mb-2 opacity-40" />
                  Upload a specimen above to run automated USPTO specimen compliance and trademark clearance.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Project Storage */}
      {activeTab === "PROJECT_STORAGE" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <FolderPlus className="size-4 text-accent" />
                Trademark Project Storage & Dockets
              </h3>
              <p className="text-xs text-muted">Organize enterprise marks by brand family, product line, and international expansion portfolios.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-canvas p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink text-sm">Moat Core Brand</span>
                <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-white">4 Marks</span>
              </div>
              <p className="text-xs text-muted">Primary enterprise marks registered in US, EP, UK, and JP.</p>
            </div>

            <div className="rounded-2xl border border-line bg-canvas p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink text-sm">NextGen AI Suite</span>
                <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold text-white">2 Marks</span>
              </div>
              <p className="text-xs text-muted">AI engine sub-brands under examination in USPTO and WIPO Madrid.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Reminders & Deadlines */}
      {activeTab === "REMINDERS_DOCKET" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Clock className="size-4 text-accent" />
              Statutory Reminders & Renewal Docket
            </h3>
            <p className="text-xs text-muted">Track Section 8 declarations, Section 9 10-year renewals, and publication opposition response deadlines.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface/80 font-bold uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-3">Mark</th>
                  <th className="px-4 py-3">Statutory Filing Requirement</th>
                  <th className="px-4 py-3">Statutory Due Date</th>
                  <th className="px-4 py-3">Grace Period End</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {trademarks.map((tm) => (
                  <tr key={tm.id} className="hover:bg-surface/50 transition">
                    <td className="px-4 py-3 font-bold text-ink">{tm.mark_name}</td>
                    <td className="px-4 py-3 text-muted">{tm.deadline_type}</td>
                    <td className="px-4 py-3 font-mono font-bold text-ink">{tm.next_deadline}</td>
                    <td className="px-4 py-3 font-mono text-faint">
                      {new Date(new Date(tm.next_deadline).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/30">
                        ON TRACK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrademarksSuitePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading Trademark Management Suite...</div>}>
      <TrademarksSuiteInner />
    </React.Suspense>
  );
}
