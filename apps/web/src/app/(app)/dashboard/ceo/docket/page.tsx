"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  Plus,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  FileText,
  Shield,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  Edit3,
  Bell,
  Scale,
  Sparkles,
  Layers,
  ChevronLeft,
  CalendarDays,
  FileCheck2,
  CheckSquare
} from "lucide-react";
import { 
  DocketItem, 
  DocketEventType, 
  DocketUrgency, 
  DocketPriority, 
  DocketSummaryStats 
} from "@/types/docket";

export default function CeoDocketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docketItems, setDocketItems] = useState<DocketItem[]>([]);
  const [summary, setSummary] = useState<DocketSummaryStats>({
    upcoming_deadlines: 0,
    filing_deadlines: 0,
    office_actions: 0,
    renewals_due: 0,
    prosecution_events: 0,
    overdue_items: 0,
  });

  // Navigation & View Mode
  const [activeSection, setActiveSection] = useState<
    "ALL" | "FILING" | "OFFICE_ACTIONS" | "RENEWALS" | "PROSECUTION" | "CALENDAR"
  >("ALL");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  // Date Edit Modal State
  const [editingDateItem, setEditingDateItem] = useState<DocketItem | null>(null);
  const [dateField, setDateField] = useState<"official_deadline" | "internal_target_date" | "renewal_date">("internal_target_date");
  const [newDateVal, setNewDateVal] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // New Event Creation Modal State
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventMatter, setNewEventMatter] = useState("");
  const [newEventType, setNewEventType] = useState<DocketEventType>("FILING_DEADLINE");
  const [newOfficialDate, setNewOfficialDate] = useState("");
  const [newInternalDate, setNewInternalDate] = useState("");
  const [newEventOwner, setNewEventOwner] = useState("Patent Operations Team");
  const [newEventPriority, setNewEventPriority] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Calendar View Sub-mode
  const [calendarSubView, setCalendarSubView] = useState<"MONTH" | "WEEK" | "DAY" | "AGENDA">("MONTH");

  const fetchDocket = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/ceo/docket");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDocketItems(json.items || []);
          if (json.summary) {
            setSummary(json.summary);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load CEO Docket:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocket();
  }, []);

  // Distinct jurisdictions
  const uniqueJurisdictions = useMemo(() => {
    const set = new Set<string>();
    docketItems.forEach((d) => {
      if (d.jurisdiction) set.add(d.jurisdiction);
    });
    return Array.from(set);
  }, [docketItems]);

  // Filtered docket items
  const filteredItems = useMemo(() => {
    return docketItems.filter((item) => {
      if (activeSection === "FILING" && item.event_type !== "FILING_DEADLINE" && item.event_type !== "PCT_NATIONAL_STAGE") return false;
      if (activeSection === "OFFICE_ACTIONS" && item.event_type !== "OFFICE_ACTION_RESPONSE") return false;
      if (activeSection === "RENEWALS" && item.event_type !== "RENEWAL_ANNUITY") return false;
      if (activeSection === "PROSECUTION" && !["EXAMINATION_REQUEST", "ORAL_HEARING", "APPEAL_DEADLINE"].includes(item.event_type)) return false;

      if (filterUrgency !== "ALL" && item.urgency !== filterUrgency) return false;
      if (filterJurisdiction !== "ALL" && item.jurisdiction !== filterJurisdiction) return false;
      if (filterPriority !== "ALL" && item.priority !== filterPriority) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchMatter = item.matter_name.toLowerCase().includes(q);
        const matchPatent = (item.patent_number || "").toLowerCase().includes(q);
        const matchApp = (item.application_number || "").toLowerCase().includes(q);
        const matchOwner = item.owner.toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchMatter && !matchPatent && !matchApp && !matchOwner && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [docketItems, activeSection, filterUrgency, filterJurisdiction, filterPriority, searchQuery]);

  const handleSaveDateEdit = async () => {
    if (!editingDateItem) return;
    if (!newDateVal) {
      setEditError("Please select a valid new date.");
      return;
    }
    if (!editReason.trim()) {
      setEditError("A formal reason for updating this legal/internal deadline is mandatory.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/ceo/docket/${editingDateItem.id}/update-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: dateField,
          newDate: newDateVal,
          reason: editReason,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDocketItems((prev) =>
            prev.map((d) => (d.id === json.item.id ? json.item : d))
          );
          setEditingDateItem(null);
          setNewDateVal("");
          setEditReason("");
          setActionNotice(`Deadline for ${json.item.matter_name} successfully updated to ${newDateVal}.`);
          setTimeout(() => setActionNotice(null), 5000);
        } else {
          setEditError(json.error || "Failed to update deadline.");
        }
      }
    } catch (e: any) {
      setEditError(e?.message || "Network error updating docket date.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !newEventMatter.trim() || !newOfficialDate) {
      setCreateError("Event Title, Matter Name, and Official Deadline are required.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/ceo/docket/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEventTitle,
          matter_name: newEventMatter,
          event_type: newEventType,
          official_deadline: newOfficialDate,
          internal_target_date: newInternalDate || newOfficialDate,
          owner: newEventOwner,
          priority: newEventPriority,
          notes: newEventNotes,
          reminder_date: newOfficialDate,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDocketItems((prev) => [json.item, ...prev]);
          setCreateEventOpen(false);
          setNewEventTitle("");
          setNewEventMatter("");
          setNewOfficialDate("");
          setNewInternalDate("");
          setNewEventNotes("");
          setActionNotice(`New docket event "${json.item.title}" registered successfully.`);
          setTimeout(() => setActionNotice(null), 5000);
        } else {
          setCreateError(json.error || "Failed to register event.");
        }
      }
    } catch (e: any) {
      setCreateError(e?.message || "Network error creating docket event.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const getUrgencyBadge = (urgency: DocketUrgency, days: number) => {
    switch (urgency) {
      case "OVERDUE":
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {Math.abs(days)}d Overdue
          </span>
        );
      case "DUE_TODAY":
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Due Today
          </span>
        );
      case "DUE_SOON":
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {days}d Remaining
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            {days}d Left (Upcoming)
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen pb-24 text-foreground font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border dark:border-[#c9a84c]/20 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest border border-[#c9a84c]/40 text-[#9a751a] dark:text-[#c9a84c] bg-[#c9a84c]/10">
              LEGAL & PROSECUTION OPERATIONS
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              DECISIONS & ACTIONS
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground dark:text-[#e8dfc8] flex items-center gap-3">
            <CalendarClock className="w-8 h-8 text-[#9a751a] dark:text-[#c9a84c]" />
            IP Docket Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Centralized IP deadline, prosecution, filing and renewal management across all global matters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchDocket(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-[#c9a84c]/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#c9a84c]" : ""}`} />
            Refresh
          </button>

          <Link
            href="/dashboard/ceo/approvals"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-[#c9a84c]/10 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
            Review Approvals
          </Link>

          <button
            onClick={() => {
              setCreateEventOpen(true);
              setCreateError(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#175a74] hover:bg-[#114459] text-white shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Docket Event
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Top 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Upcoming Deadlines */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Upcoming Deadlines</span>
            <Clock className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
          </div>
          <div className="text-2xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
            {loading ? "..." : summary.upcoming_deadlines}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active statutory items</p>
        </div>

        {/* Filing Deadlines */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Filing Deadlines</span>
            <FileCheck2 className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
          </div>
          <div className="text-2xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
            {loading ? "..." : summary.filing_deadlines}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Patent & PCT filings</p>
        </div>

        {/* Office Actions */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Office Actions</span>
            <Scale className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {loading ? "..." : summary.office_actions}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Examiner responses</p>
        </div>

        {/* Renewals Due */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Renewals Due</span>
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {loading ? "..." : summary.renewals_due}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Annuity maintenance</p>
        </div>

        {/* Prosecution Events */}
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-[#c9a84c]/40 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
            <span>Prosecution</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
            {loading ? "..." : summary.prosecution_events}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Hearings & actions</p>
        </div>

        {/* Overdue Items */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-card dark:bg-[#1a1a0e] shadow-sm hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-rose-500 mb-1">
            <span>Overdue Items</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500 mt-1">
            {loading ? "..." : summary.overdue_items}
          </div>
          <p className="text-[10px] text-rose-400/80 mt-0.5">Requires immediate action</p>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border dark:border-[#c9a84c]/20 pb-3 scrollbar-none">
          {[
            { id: "ALL", label: "Upcoming Deadlines" },
            { id: "FILING", label: "Filing Deadlines" },
            { id: "OFFICE_ACTIONS", label: "Office Actions" },
            { id: "RENEWALS", label: "IP Renewals" },
            { id: "PROSECUTION", label: "Prosecution Events" },
            { id: "CALENDAR", label: "Docket Calendar" },
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
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
              placeholder="Search by patent no., app no., matter name, or owner..."
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
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="w-full text-xs bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/25 rounded-lg px-3 py-2 text-foreground dark:text-[#e8dfc8] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            >
              <option value="ALL">All Urgencies</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DUE_TODAY">Due Today</option>
              <option value="DUE_SOON">Due Soon (≤ 7 Days)</option>
              <option value="UPCOMING">Upcoming</option>
            </select>
          </div>

          <div>
            <select
              value={filterJurisdiction}
              onChange={(e) => setFilterJurisdiction(e.target.value)}
              className="w-full text-xs bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/25 rounded-lg px-3 py-2 text-foreground dark:text-[#e8dfc8] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
            >
              <option value="ALL">All Jurisdictions</option>
              {uniqueJurisdictions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: List View vs Calendar View */}
      {activeSection === "CALENDAR" ? (
        /* Docket Calendar View */
        <div className="p-6 rounded-2xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border dark:border-[#c9a84c]/15 pb-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-6 h-6 text-[#9a751a] dark:text-[#c9a84c]" />
              <div>
                <h2 className="text-base font-bold text-foreground dark:text-[#e8dfc8]">Docket Calendar Schedule</h2>
                <p className="text-xs text-muted-foreground">
                  Visual timeline of all statutory patent and prosecution deadlines.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(["MONTH", "WEEK", "DAY", "AGENDA"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setCalendarSubView(view)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calendarSubView === view
                      ? "bg-[#175a74] text-white"
                      : "border border-border dark:border-[#c9a84c]/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {/* Agenda Grid */}
          <div className="space-y-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Upcoming Deadlines Timeline (Next 30 Days)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/15 bg-muted/20 dark:bg-[#131309] hover:border-[#c9a84c]/40 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/30">
                      {item.official_deadline}
                    </span>
                    {getUrgencyBadge(item.urgency, item.days_remaining)}
                  </div>

                  <h4 className="text-sm font-bold text-foreground dark:text-[#e8dfc8] line-clamp-1">{item.title}</h4>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    Matter: <strong className="text-foreground dark:text-[#e8dfc8]">{item.matter_name}</strong>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border dark:border-[#c9a84c]/10">
                    <span>Owner: {item.owner}</span>
                    <Link
                      href={`/dashboard/ceo/docket/${item.id}`}
                      className="text-[#9a751a] dark:text-[#c9a84c] hover:underline font-bold"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Docket List Table View */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Showing {filteredItems.length} docket item{filteredItems.length === 1 ? "" : "s"}</span>
            <span className="font-semibold">Sorted by Statutory Urgency</span>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e]">
              <RefreshCw className="w-8 h-8 text-[#c9a84c] animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading IP docket records...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e]">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-foreground dark:text-[#e8dfc8]">No docket deadlines found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No active events matching your filter selections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] hover:border-[#c9a84c]/45 transition-all shadow-sm group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Matter, Event, Description */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getUrgencyBadge(item.urgency, item.days_remaining)}
                        <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/30">
                          {item.event_type_label}
                        </span>
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase bg-muted/40 dark:bg-[#131309] text-muted-foreground border border-border dark:border-[#c9a84c]/20">
                          {item.jurisdiction}
                        </span>
                        {item.patent_number && (
                          <span className="text-xs text-muted-foreground">
                            Pat: <strong className="text-foreground dark:text-[#e8dfc8]">{item.patent_number}</strong>
                          </span>
                        )}
                        {item.requires_ceo_approval && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            Requires CEO Approval
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-foreground dark:text-[#e8dfc8] group-hover:text-[#9a751a] dark:group-hover:text-[#c9a84c] transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                        Matter: <strong className="text-foreground dark:text-[#e8dfc8]">{item.matter_name}</strong> • {item.description}
                      </p>

                      {/* Timeline & Metadata */}
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-muted-foreground pt-3 border-t border-border dark:border-[#c9a84c]/10">
                        <div>
                          <span>Official Deadline:</span>{" "}
                          <strong className="text-amber-500 font-bold">{item.official_deadline}</strong>
                        </div>
                        <div>
                          <span>Internal Target:</span>{" "}
                          <strong className="text-foreground dark:text-[#e8dfc8] font-bold">{item.internal_target_date || item.official_deadline}</strong>
                        </div>
                        <div>
                          <span>Owner:</span>{" "}
                          <strong className="text-foreground dark:text-[#e8dfc8] font-semibold">{item.owner}</strong> ({item.responsible_team})
                        </div>
                        <div>
                          <span>Priority:</span>{" "}
                          <strong className="text-foreground dark:text-[#e8dfc8] font-semibold">{item.priority}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-border dark:border-[#c9a84c]/15">
                      <button
                        onClick={() => {
                          setEditingDateItem(item);
                          setNewDateVal(item.internal_target_date || item.official_deadline);
                          setEditReason("");
                          setEditError(null);
                        }}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-[#c9a84c]/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
                        Edit Date
                      </button>

                      <Link
                        href={`/dashboard/ceo/docket/${item.id}`}
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Matter Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Date Modal */}
      {editingDateItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a0e] border border-stone-200 dark:border-[#c9a84c]/30 p-6 space-y-4 shadow-2xl text-stone-900 dark:text-[#e8dfc8]">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-[#c9a84c]/20 pb-3">
              <div>
                <h3 className="text-sm font-black text-stone-900 dark:text-[#e8dfc8] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
                  Edit Docket Date
                </h3>
                <p className="text-xs text-stone-600 dark:text-[#e8dfc8]/70 mt-0.5">{editingDateItem.matter_name}</p>
              </div>
              <button
                onClick={() => setEditingDateItem(null)}
                className="text-stone-400 hover:text-stone-700 dark:text-[#e8dfc8]/60 dark:hover:text-[#e8dfc8] p-1 rounded-md text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Target Date Field
                </label>
                <select
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value as any)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                >
                  <option value="internal_target_date">Internal Target Date (Safest)</option>
                  <option value="official_deadline">Official Statutory Deadline (Authorized)</option>
                  <option value="renewal_date">Renewal / Annuity Date</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDateVal}
                  onChange={(e) => setNewDateVal(e.target.value)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Justification / Audit Reason (Mandatory)
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g., PTO granted 3-month extension under 37 CFR 1.136(a) or internal engineering target adjusted..."
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] placeholder:text-stone-400 dark:placeholder:text-[#e8dfc8]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-[#c9a84c]/20">
              <button
                onClick={() => setEditingDateItem(null)}
                disabled={editSubmitting}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-[#c9a84c]/30 bg-white dark:bg-transparent text-stone-700 dark:text-[#e8dfc8] hover:bg-stone-100 dark:hover:bg-[#c9a84c]/10 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDateEdit}
                disabled={editSubmitting}
                className="px-5 py-2 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white text-xs font-black shadow-sm transition-all"
              >
                {editSubmitting ? "Saving..." : "Commit Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {createEventOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a1a0e] border border-stone-200 dark:border-[#c9a84c]/30 p-6 space-y-4 shadow-2xl text-stone-900 dark:text-[#e8dfc8]">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-[#c9a84c]/20 pb-3">
              <h3 className="text-sm font-black text-stone-900 dark:text-[#e8dfc8] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
                Register Internal Docket Event
              </h3>
              <button
                onClick={() => setCreateEventOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:text-[#e8dfc8]/60 dark:hover:text-[#e8dfc8] p-1 rounded-md text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., USPTO Non-Final Office Action Response"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] placeholder:text-stone-400 dark:placeholder:text-[#e8dfc8]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Matter / Invention Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., AI Predictive Monitoring System"
                  value={newEventMatter}
                  onChange={(e) => setNewEventMatter(e.target.value)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] placeholder:text-stone-400 dark:placeholder:text-[#e8dfc8]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                    Event Type
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                  >
                    <option value="FILING_DEADLINE">Filing Deadline</option>
                    <option value="OFFICE_ACTION_RESPONSE">Office Action Response</option>
                    <option value="RENEWAL_ANNUITY">Renewal Annuity</option>
                    <option value="ORAL_HEARING">Oral Hearing</option>
                    <option value="EXAMINATION_REQUEST">Examination Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                    Priority
                  </label>
                  <select
                    value={newEventPriority}
                    onChange={(e) => setNewEventPriority(e.target.value as any)}
                    className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                    Official Deadline
                  </label>
                  <input
                    type="date"
                    value={newOfficialDate}
                    onChange={(e) => setNewOfficialDate(e.target.value)}
                    className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                    Internal Target Date
                  </label>
                  <input
                    type="date"
                    value={newInternalDate}
                    onChange={(e) => setNewInternalDate(e.target.value)}
                    className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Responsible Owner
                </label>
                <input
                  type="text"
                  value={newEventOwner}
                  onChange={(e) => setNewEventOwner(e.target.value)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] placeholder:text-stone-400 dark:placeholder:text-[#e8dfc8]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  placeholder="Additional context or examiner details..."
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] placeholder:text-stone-400 dark:placeholder:text-[#e8dfc8]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              {createError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {createError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-[#c9a84c]/20">
              <button
                onClick={() => setCreateEventOpen(false)}
                disabled={createSubmitting}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-[#c9a84c]/30 bg-white dark:bg-transparent text-stone-700 dark:text-[#e8dfc8] hover:bg-stone-100 dark:hover:bg-[#c9a84c]/10 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={createSubmitting}
                className="px-5 py-2 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white text-xs font-black shadow-sm transition-all"
              >
                {createSubmitting ? "Creating..." : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
