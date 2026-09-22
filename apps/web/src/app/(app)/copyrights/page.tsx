"use client";

import * as React from "react";
import {
  FileCode,
  ShieldCheck,
  BookOpen,
  UserCheck,
  Award,
  UploadCloud,
  CheckCircle2,
  Lock,
  Download,
  Search,
  Plus,
  Copy,
  FolderLock,
  FileCheck2,
  Calendar,
  Sparkles,
} from "lucide-react";

type CopyrightTab = "SOURCE_CODE" | "LITERARY_WORKS" | "AUTHORSHIP_VERIFY" | "STATUTORY_VAULT";

interface CopyrightDeposit {
  id: string;
  registration_number?: string;
  title: string;
  category: "COMPUTER_SOFTWARE" | "LITERARY_WORK" | "VISUAL_ART" | "UI_SCHEMA";
  claimant: string;
  authors: string[];
  sha256_hash: string;
  date_created: string;
  date_registered?: string;
  status: "DEPOSITED_SECURE" | "CERTIFIED_REGISTERED" | "PENDING_OFFICE_ACTION";
  git_commit?: string;
  pages_count?: number;
}

const INITIAL_DEPOSITS: CopyrightDeposit[] = [
  {
    id: "CR-01",
    registration_number: "TX0009481234",
    title: "MOAT IP Platform Source Code and Cryptographic Engine v1.0",
    category: "COMPUTER_SOFTWARE",
    claimant: "Moat IP Global Inc.",
    authors: ["Dr. Linus Vance", "Sarah Jenkins", "Michael Chen"],
    sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    date_created: "2024-01-15",
    date_registered: "2024-03-02",
    status: "CERTIFIED_REGISTERED",
    git_commit: "commit 8f92ab14d8",
    pages_count: 50,
  },
  {
    id: "CR-02",
    title: "Zero-Trust Multi-Tenant Enclave Architecture Whitepaper",
    category: "LITERARY_WORK",
    claimant: "Moat IP Global Inc.",
    authors: ["Dr. Alexander Novak", "Sarah Jenkins, PhD"],
    sha256_hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    date_created: "2024-02-10",
    status: "DEPOSITED_SECURE",
    pages_count: 38,
  },
  {
    id: "CR-03",
    title: "Moat Web Application UI Component Library & Visual Assets",
    category: "UI_SCHEMA",
    claimant: "Moat IP Global Inc.",
    authors: ["Moat UI Design Team (Work for Hire)"],
    sha256_hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    date_created: "2024-03-01",
    status: "DEPOSITED_SECURE",
    pages_count: 24,
  },
];

export default function CopyrightsSuitePage() {
  const [activeTab, setActiveTab] = React.useState<CopyrightTab>("SOURCE_CODE");
  const [deposits, setDeposits] = React.useState<CopyrightDeposit[]>(INITIAL_DEPOSITS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newCategory, setNewCategory] = React.useState<"COMPUTER_SOFTWARE" | "LITERARY_WORK" | "VISUAL_ART" | "UI_SCHEMA">("COMPUTER_SOFTWARE");
  const [newAuthors, setNewAuthors] = React.useState("");
  const [isDepositing, setIsDepositing] = React.useState(false);
  const [depositNotification, setDepositNotification] = React.useState<string | null>(null);

  const handleCreateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsDepositing(true);
    setTimeout(() => {
      // Synthesize SHA-256 hash
      const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const newDep: CopyrightDeposit = {
        id: `CR-0${deposits.length + 1}`,
        title: newTitle.trim(),
        category: newCategory,
        claimant: "Moat IP Global Inc.",
        authors: newAuthors.split(",").map((a) => a.trim()).filter(Boolean),
        sha256_hash: randomHex,
        date_created: new Date().toISOString().split("T")[0],
        status: "DEPOSITED_SECURE",
        pages_count: 50,
      };

      setDeposits([newDep, ...deposits]);
      setIsDepositing(false);
      setNewTitle("");
      setNewAuthors("");
      setDepositNotification(`Work "${newDep.title}" stamped with SHA-256 cryptographic proof.`);
      setTimeout(() => setDepositNotification(null), 4000);
    }, 600);
  };

  const filteredDeposits = deposits.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.sha256_hash.includes(q) || d.authors.some((a) => a.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
                <FileCode className="size-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-ink">Copyrights & Authorship Suite</h1>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-text">
                Statutory Code & Literary Vault
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Source code cryptographic deposit (SHA-256), work-for-hire assignment verification, literary works registry & US Copyright Office statutory docket.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("SOURCE_CODE")}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 transition shadow-xs"
            >
              <Lock className="size-3.5" />
              New Cryptographic Deposit
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line/60 pt-4">
          {[
            { id: "SOURCE_CODE", label: "Source Code Deposit & Hash Vault", icon: FileCode },
            { id: "LITERARY_WORKS", label: "Literary, UI & Artistic Works", icon: BookOpen },
            { id: "AUTHORSHIP_VERIFY", label: "Authorship & Work-for-Hire", icon: UserCheck },
            { id: "STATUTORY_VAULT", label: "Statutory Certificate Vault", icon: FolderLock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CopyrightTab)}
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

      {depositNotification && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="size-4 shrink-0" />
          {depositNotification}
        </div>
      )}

      {/* Tab 1: Source Code Deposit */}
      {activeTab === "SOURCE_CODE" && (
        <div className="space-y-6">
          {/* New Deposit Stamping Form */}
          <form
            onSubmit={handleCreateDeposit}
            className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4"
          >
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Lock className="size-4 text-accent" />
              Create Cryptographic Source Code Deposit (Circular 61 Compliance)
            </h3>
            <p className="text-xs text-muted">
              Generates an immutable cryptographic SHA-256 fingerprint for git source code repositories and compiles the first and last 25 pages of unblocked source code for Copyright Office submission.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Work Title / Module</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. MOAT Cryptographic Kernel v2.4"
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink outline-none"
                >
                  <option value="COMPUTER_SOFTWARE">Computer Software / Source Code</option>
                  <option value="LITERARY_WORK">Technical Specification / Whitepaper</option>
                  <option value="UI_SCHEMA">UI Schema & Visual Artwork</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Authors / Contributors</label>
                <input
                  type="text"
                  value={newAuthors}
                  onChange={(e) => setNewAuthors(e.target.value)}
                  placeholder="Comma-separated authors e.g. Linus Vance, Sarah Jenkins"
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isDepositing}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50 transition shadow-xs"
              >
                <ShieldCheck className="size-3.5" />
                {isDepositing ? "Stamping SHA-256 Proof..." : "Stamp Cryptographic Deposit"}
              </button>
            </div>
          </form>

          {/* Deposits List */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FolderLock className="size-4 text-accent" />
                Cryptographic Deposit Ledger
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search deposits..."
                  className="w-56 rounded-xl border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="rounded-xl border border-line bg-canvas p-4 space-y-2 hover:border-accent/60 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-faint uppercase">
                        {dep.id} · {dep.category}
                      </span>
                      <h4 className="text-sm font-bold text-ink">{dep.title}</h4>
                      <p className="text-xs text-muted">
                        Claimant: <strong className="text-ink">{dep.claimant}</strong> · Authors: {dep.authors.join(", ")}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        dep.status === "CERTIFIED_REGISTERED"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                          : "bg-accent/10 text-accent border border-accent/30"
                      }`}
                    >
                      {dep.status}
                    </span>
                  </div>

                  <div className="rounded-lg border border-line/60 bg-surface p-2.5 font-mono text-[11px] text-muted flex items-center justify-between gap-2 overflow-x-auto">
                    <span>SHA-256: <strong className="text-ink select-all">{dep.sha256_hash}</strong></span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(dep.sha256_hash);
                        alert("SHA-256 hash copied to clipboard!");
                      }}
                      className="p-1 hover:text-ink transition shrink-0"
                      title="Copy Hash"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-faint">
                    <span>Created: {dep.date_created} {dep.date_registered ? `· Registered: ${dep.date_registered}` : ""}</span>
                    <span>Pages: {dep.pages_count || 50} (Redacted / Clean)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Literary Works */}
      {activeTab === "LITERARY_WORKS" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <BookOpen className="size-4 text-accent" />
            Literary & Artistic Works Registry
          </h3>
          <p className="text-xs text-muted">
            Management of technical whitepapers, architectural schematics, marketing documentation, and UI visual artwork under Copyright Act 17 U.S.C. § 102.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
              <span className="text-xs font-bold text-ink">Architectural Whitepapers</span>
              <p className="text-xs text-muted">2 Whitepapers stamped with immutable cryptographic timestamping.</p>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
              <span className="text-xs font-bold text-ink">Design Schematics & UI Mockups</span>
              <p className="text-xs text-muted">UI theme systems and SVG icon vector files cataloged.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Authorship Verification */}
      {activeTab === "AUTHORSHIP_VERIFY" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <UserCheck className="size-4 text-accent" />
            Work-for-Hire & IP Assignment Tracker
          </h3>
          <p className="text-xs text-muted">
            Ensure complete chain of title by auditing employee invention assignment agreements (Proprietary Information & Inventions Agreements - PIIA) and independent contractor IP transfers.
          </p>

          <div className="overflow-hidden rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface/80 font-bold uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-3">Contributor / Author</th>
                  <th className="px-4 py-3">Agreement Type</th>
                  <th className="px-4 py-3">Executed Date</th>
                  <th className="px-4 py-3">Assigned Works</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                <tr className="hover:bg-surface/50 transition">
                  <td className="px-4 py-3 font-bold text-ink">Dr. Linus Vance</td>
                  <td className="px-4 py-3 text-muted">PIIA & Comprehensive IP Assignment</td>
                  <td className="px-4 py-3 font-mono text-ink">2023-01-10</td>
                  <td className="px-4 py-3 text-muted">All Core Software & Algorithms</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/30">
                      VERIFIED & ON FILE
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-surface/50 transition">
                  <td className="px-4 py-3 font-bold text-ink">Sarah Jenkins, PhD</td>
                  <td className="px-4 py-3 text-muted">Employee Invention Assignment</td>
                  <td className="px-4 py-3 font-mono text-ink">2023-03-15</td>
                  <td className="px-4 py-3 text-muted">Cryptographic Outbox & Enclave Code</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/30">
                      VERIFIED & ON FILE
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Statutory Vault */}
      {activeTab === "STATUTORY_VAULT" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <FolderLock className="size-4 text-accent" />
            Statutory Deposit & Registration Certificates
          </h3>
          <p className="text-xs text-muted">
            Official registration certificates issued by the United States Copyright Office (TX series) granting statutory damages and attorney fee eligibility under 17 U.S.C. § 412.
          </p>

          <div className="rounded-xl border border-line bg-canvas p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="size-8 text-accent" />
              <div>
                <h4 className="text-xs font-bold text-ink">Certificate TX0009481234</h4>
                <p className="text-[11px] text-muted">MOAT IP Platform Source Code and Cryptographic Engine v1.0</p>
              </div>
            </div>
            <button
              onClick={() => alert("Downloading certified Copyright Registration Certificate PDF...")}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
            >
              <Download className="size-3.5" /> Download Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
