"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  ShieldAlert,
  Calendar,
  User,
  Building,
  RotateCcw,
  Sparkles,
  ChevronRight,
  FileCheck2,
  ExternalLink,
  Layers
} from "lucide-react";
import { 
  ApprovalItem, 
  ApprovalStatus, 
  ApprovalType, 
  ApprovalPriority, 
  ApprovalsSummaryStats 
} from "@/types/approvals";

export default function CeoApprovalsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [summary, setSummary] = useState<ApprovalsSummaryStats>({
    pending_approvals: 0,
    project_approvals: 0,
    filing_approvals: 0,
    rework_required: 0,
    recently_approved: 0,
  });

  // Filter state
  const [activeTab, setActiveTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");

  const fetchApprovals = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/ceo/approvals");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setApprovals(json.approvals || []);
          if (json.summary) {
            setSummary(json.summary);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load CEO approvals:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    approvals.forEach((a) => {
      if (a.assigned_team) set.add(a.assigned_team);
    });
    return Array.from(set);
  }, [approvals]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      if (activeTab === "Projects" && item.type !== "Project") return false;
      if (activeTab === "Inventions" && item.type !== "Invention") return false;
      if (activeTab === "Patent Filings" && item.type !== "Patent Filing") return false;
      if (activeTab === "Documents" && item.type !== "Document") return false;
      if (activeTab === "Rework Required" && item.status !== "Rework Required") return false;
      if (activeTab === "Approved" && item.status !== "Approved") return false;
      if (activeTab === "Rejected" && item.status !== "Rejected") return false;

      if (selectedType !== "ALL" && item.type !== selectedType) return false;
      if (selectedPriority !== "ALL" && item.priority !== selectedPriority) return false;
      if (selectedTeam !== "ALL" && item.assigned_team !== selectedTeam) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchOwner = item.owner.toLowerCase().includes(query);
        const matchTeam = item.assigned_team.toLowerCase().includes(query);
        const matchSummary = (item.summary || "").toLowerCase().includes(query);
        const matchStage = item.current_stage.toLowerCase().includes(query);
        if (!matchName && !matchOwner && !matchTeam && !matchSummary && !matchStage) {
          return false;
        }
      }

      return true;
    });
  }, [approvals, activeTab, selectedType, selectedPriority, selectedTeam, searchQuery]);

  const getPriorityBadge = (priority: ApprovalPriority) => {
    switch (priority) {
      case "Critical":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/30";
      case "High":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/30";
      case "Medium":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/30";
      default:
        return "bg-muted/40 text-muted-foreground border border-border";
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "Pending Approval":
        return "bg-amber-500/15 text-amber-500 border border-amber-500/40 animate-pulse";
      case "Rework Required":
        return "bg-orange-500/15 text-orange-500 border border-orange-500/40";
      case "Approved":
        return "bg-emerald-500/15 text-emerald-500 border border-emerald-500/40";
      case "Rejected":
        return "bg-rose-500/15 text-rose-500 border border-rose-500/40";
      default:
        return "bg-muted/40 text-muted-foreground border border-border";
    }
  };

  const getTypeBadge = (type: ApprovalType) => {
    return "bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/30";
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen pb-24 text-foreground font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border dark:border-[#c9a84c]/20 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest border border-[#c9a84c]/40 text-[#9a751a] dark:text-[#c9a84c] bg-[#c9a84c]/10">
              EXECUTIVE GOVERNANCE
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              DECISIONS & ACTIONS
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground dark:text-[#e8dfc8] flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-[#9a751a] dark:text-[#c9a84c]" />
            CEO Approvals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Review projects, inventions, patent filings and documents requiring executive approval.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchApprovals(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-[#c9a84c]/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#c9a84c]" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/ceo/docket"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-[#c9a84c]/10 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
            View IP Docket
          </Link>
        </div>
      </div>

      {/* Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Pending Approvals */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">
            <span>Pending Approvals</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {loading ? "..." : summary.pending_approvals}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Requires CEO authorization</p>
        </div>

        {/* Project Approvals */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Project Approvals</span>
            <Layers className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
          </div>
          <div className="text-2xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
            {loading ? "..." : summary.project_approvals}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Strategic initiatives</p>
        </div>

        {/* Filing Approvals */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Filing Approvals</span>
            <FileCheck2 className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
          </div>
          <div className="text-2xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
            {loading ? "..." : summary.filing_approvals}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Patent & statutory filings</p>
        </div>

        {/* Rework Required */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-orange-500 mb-1">
            <span>Rework Required</span>
            <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-500 mt-1">
            {loading ? "..." : summary.rework_required}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sent back for revisions</p>
        </div>

        {/* Recently Approved */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">
            <span>Recently Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {loading ? "..." : summary.recently_approved}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Authorized for execution</p>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border dark:border-[#c9a84c]/20 pb-3 scrollbar-none">
          {[
            { id: "All", label: "All Items" },
            { id: "Projects", label: "Projects" },
            { id: "Inventions", label: "Inventions" },
            { id: "Patent Filings", label: "Patent Filings" },
            { id: "Documents", label: "Documents" },
            { id: "Rework Required", label: "Rework Required" },
            { id: "Approved", label: "Approved" },
            { id: "Rejected", label: "Rejected" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#175a74] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground dark:hover:text-[#e8dfc8] hover:bg-muted/30 dark:hover:bg-[#1a1a0e]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Multi-criteria Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-card dark:bg-[#1a1a0e] p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 shadow-sm">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by matter name, owner, team, or workflow stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/25 rounded-lg pl-10 pr-4 py-2 text-foreground dark:text-[#e8dfc8] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/25 rounded-lg px-3 py-2 text-foreground dark:text-[#e8dfc8] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full text-xs bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/25 rounded-lg px-3 py-2 text-foreground dark:text-[#e8dfc8] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            >
              <option value="ALL">All Assigned Teams</option>
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Approval List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Showing {filteredApprovals.length} approval item{filteredApprovals.length === 1 ? "" : "s"}</span>
          <span className="font-semibold">Target Deadline Ordering</span>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e]">
            <RefreshCw className="w-8 h-8 text-[#c9a84c] animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading CEO approval queue...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e]">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold text-foreground dark:text-[#e8dfc8]">No pending approvals found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              There are no approval requests matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApprovals.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] hover:border-[#c9a84c]/45 transition-all shadow-sm group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Title, Type, Stage */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider ${getTypeBadge(item.type)}`}>
                        {item.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${getPriorityBadge(item.priority)}`}>
                        {item.priority} Priority
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-[#9a751a] dark:text-[#c9a84c] font-bold flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        Stage: {item.current_stage}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-foreground dark:text-[#e8dfc8] group-hover:text-[#9a751a] dark:group-hover:text-[#c9a84c] transition-colors">
                      {item.name}
                    </h3>

                    {item.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-3xl leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    {/* Metadata Grid */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-muted-foreground pt-3 border-t border-border dark:border-[#c9a84c]/10">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Owner: <strong className="text-foreground dark:text-[#e8dfc8] font-semibold">{item.owner}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Team: <strong className="text-foreground dark:text-[#e8dfc8] font-semibold">{item.assigned_team}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Submitted: <span className="text-foreground dark:text-[#e8dfc8] font-semibold">{item.submitted_date.split("T")[0]}</span> by <span className="text-foreground dark:text-[#e8dfc8]">{item.submitted_by}</span></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Deadline: <strong className="text-amber-500 font-bold">{item.deadline}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
                        <span>Documents: <strong className="text-foreground dark:text-[#e8dfc8] font-bold">{item.documents?.length || 0} files</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CTA */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-border dark:border-[#c9a84c]/15">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] font-black uppercase text-muted-foreground">Est. Budget</div>
                      <div className="text-sm font-black text-foreground dark:text-[#e8dfc8]">
                        ${(item.cost_estimate || 14500).toLocaleString()}
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/ceo/approvals/${item.id}`}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white text-xs font-bold shadow-xs transition-all hover:gap-3"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
