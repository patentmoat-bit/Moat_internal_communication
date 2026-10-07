"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { 
  Globe, RefreshCw, Search, Filter, Calendar, ArrowUpDown, 
  ExternalLink, ArrowRight, ShieldCheck, Sparkles, Building2, 
  Scale, BookOpen, Cpu, Lightbulb, AlertCircle, X, CheckCircle2,
  Clock, Pause, Play, Zap, Flame
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IPNewsArticle, IPNewsResponse } from "@/types/news";

const CATEGORIES = [
  "All",
  "Patents",
  "Trademarks",
  "Copyright",
  "Competitor IP",
  "Technology",
  "Regulatory",
  "Market"
];

const SOURCES = [
  "All",
  "WIPO",
  "EPO",
  "USPTO",
  "IPWatchdog",
  "Patently-O",
  "UK IPO"
];

function CeoNewsPageContent() {

  const [articles, setArticles] = useState<IPNewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sourceCounts, setSourceCounts] = useState<{ name: string; count: number }[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{ name: string; count: number }[]>([]);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSource, setSelectedSource] = useState("All");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [quickDate, setQuickDate] = useState<"all" | "today" | "upcoming" | "48h" | "7d">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Upcoming Events State
  const [upcomingEvents, setUpcomingEvents] = useState<IPNewsArticle[]>([]);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number>(0);

  // Auto-Update States
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // seconds
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tracking refs to detect new bulletins
  const latestArticleIdRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(Date.now());

  const fetchNews = useCallback(async (isRefresh = false, isSilent = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setRefreshMessage(null);
    } else if (isSilent) {
      setIsAutoSyncing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (isRefresh) {
        // Trigger server live syndication first
        const refreshRes = await fetch("/api/ceo/news/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const refData = await refreshRes.json();
          if (refData.new_articles_count > 0) {
            setRefreshMessage(`Synchronized ${refData.new_articles_count} new IP update${refData.new_articles_count > 1 ? "s" : ""}`);
          } else {
            setRefreshMessage("Feeds up to date. Verified latest bulletins.");
          }
          setTimeout(() => setRefreshMessage(null), 4500);
        }
      }

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (selectedSource !== "All") params.set("source", selectedSource);
      params.set("sort", sortOrder);
      if (quickDate !== "all") params.set("quick_date", quickDate);
      if (searchQuery) params.set("search", searchQuery);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/ceo/news?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load news: ${res.status}`);
      }

      const data: { success: boolean } & IPNewsResponse = await res.json();
      if (data.success) {
        const fetchedArticles = data.articles || [];

        // Alert user if fresh articles arrived in silent background auto-refresh
        if (isSilent && latestArticleIdRef.current && fetchedArticles[0]?.id && fetchedArticles[0].id !== latestArticleIdRef.current) {
          setRefreshMessage("Live intelligence updated with latest IP bulletins published today.");
          setTimeout(() => setRefreshMessage(null), 4500);
        }
        if (fetchedArticles[0]?.id) {
          latestArticleIdRef.current = fetchedArticles[0].id;
        }

        setArticles(fetchedArticles);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setLastUpdated(data.last_updated || new Date().toISOString());
        setSourceCounts(data.sources || []);
        setCategoryCounts(data.categories || []);
        if (data.upcoming_events) {
          setUpcomingEvents(data.upcoming_events);
        }
        if (data.stats?.upcoming_events_count !== undefined) {
          setUpcomingEventsCount(data.stats.upcoming_events_count);
        } else if (data.upcoming_events) {
          setUpcomingEventsCount(data.upcoming_events.length);
        }
        lastFetchTimeRef.current = Date.now();
      } else {
        throw new Error("Unable to parse news response");
      }
    } catch (err: any) {
      console.error("Error fetching news:", err);
      if (!isSilent) {
        setError(err?.message || "We couldn't refresh IP news. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsAutoSyncing(false);
    }
  }, [page, selectedCategory, selectedSource, sortOrder, searchQuery, quickDate, dateFrom, dateTo]);

  // Initial load
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Automatic interval timer to keep news continuously updated
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchNews(false, true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

  return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, fetchNews]);

  // Visibility / Tab-focus auto-sync: when user switches back, check for latest bulletins
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastFetchTimeRef.current;
        if (elapsed > 45_000) {
          fetchNews(false, true);
          setSecondsLeft(refreshInterval);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchNews, refreshInterval]);

  // Debounced search trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedSource("All");
    setSortOrder("latest");
    setQuickDate("all");
    setSearchInput("");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Helper for source badges
  const getSourceBadgeStyle = (source: string) => {
    switch (source.toUpperCase()) {
      case "WIPO":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30";
      case "EPO":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
      case "USPTO":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
      case "UK IPO":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30";
      case "IPWATCHDOG":
        return "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30";
      case "PATENTLY-O":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30";
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case "AI & IP":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/40";
      case "Patents":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40";
      case "Trademarks":
        return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/40";
      case "Copyright":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/40";
      case "Legal / Regulatory":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40";
      case "Patent Offices":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40";
      case "International IP":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40";
      default:
        return "bg-amber-50/80 text-amber-800 border-amber-200 dark:bg-[#c9a84c]/15 dark:text-[#e8dfc8] dark:border-[#c9a84c]/30";
    }
  };

  // Format date strictly as 'Oct 1 2026', 'Sep 30 2026', etc.
  const formatPublishedDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getUTCMonth()];
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();

      return `${month} ${day} ${year}`;
    } catch {
      return isoString;
    }
  };

  // Format event date as 'Oct 8, 2026'
  const formatEventDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getUTCMonth()];
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();

      return `${month} ${day}, ${year}`;
    } catch {
      return isoString;
    }
  };

  // Check if article was published recently or on October 5 & 6, 2026
  const isArticleNewToday = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isRecent = (now.getTime() - d.getTime() < 48 * 60 * 60 * 1000) && (now.getTime() >= d.getTime());
      const isOctDate = isoString.startsWith("2026-10-05") || isoString.startsWith("2026-10-06");
      return isRecent || isOctDate;
    } catch {
      return false;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="pt-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border dark:border-[#c9a84c]/20 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="border-[#c9a84c] text-[#9a751a] dark:text-[#c9a84c] bg-[#c9a84c]/10 tracking-widest text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm">
              MOAT CEO INTELLIGENCE
            </Badge>
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-sm border border-emerald-200 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE EXTERNAL SOURCES
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-[#e8dfc8]">
            IP NEWS & INTELLIGENCE
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-[#e8dfc8]/70 max-w-2xl font-medium">
            Stay informed on important patent, trademark, technology and IP developments directly from official patent offices and authoritative global sources.
          </p>
        </div>

        {/* Live Auto-Update & Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Live Auto-Sync Status Indicator */}
          <div className="flex items-center gap-2.5 bg-secondary/80 dark:bg-[#121208] border border-border dark:border-[#c9a84c]/25 px-3 py-1.5 rounded-sm text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              {autoRefresh && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? "bg-emerald-500" : "bg-zinc-400"}`} />
            </span>
            
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="font-bold text-foreground">
                {autoRefresh ? "AUTO-UPDATE" : "PAUSED"}
              </span>
              {autoRefresh && (
                <span className="text-muted-foreground text-[10px]">
                  ({secondsLeft}s)
                </span>
              )}
            </div>

            {/* Quick frequency presets */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-border dark:border-[#c9a84c]/20">
              {[30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setRefreshInterval(sec);
                    setSecondsLeft(sec);
                    setAutoRefresh(true);
                  }}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                    refreshInterval === sec && autoRefresh
                      ? "bg-[#175a74] text-white font-black"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  title={`Auto-check news every ${sec} seconds`}
                >
                  {sec === 120 ? "2m" : `${sec}s`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title={autoRefresh ? "Pause automatic polling" : "Resume automatic polling"}
              >
                {autoRefresh ? (
                  <Pause className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                ) : (
                  <Play className="w-3 h-3 text-emerald-500 hover:text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {lastUpdated && (
            <div className="text-[11px] text-zinc-500 dark:text-[#e8dfc8]/50">
              Last sync: <span className="text-zinc-700 dark:text-[#e8dfc8]/80 font-mono font-medium">{new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <Button
            onClick={() => fetchNews(true)}
            disabled={refreshing || loading}
            className="bg-[#175a74] hover:bg-[#114459] text-white font-bold text-xs uppercase tracking-wider px-4 py-2 h-9 rounded-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || isAutoSyncing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing Sources..." : isAutoSyncing ? "Auto-Syncing..." : "Refresh Feed"}
          </Button>
        </div>
      </div>

      {/* Sync notification banner */}
      {refreshMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs px-4 py-3 rounded flex items-center justify-between gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{refreshMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setRefreshMessage(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Executive KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm dark:shadow-md">
          <CardContent className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verified Articles</div>
            <div className="text-2xl font-black text-[#9a751a] dark:text-amber-400 mt-1">{total}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> WIPO • EPO • USPTO • IPW
            </div>
          </CardContent>
        </Card>

        <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm dark:shadow-md">
          <CardContent className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active IP Offices</div>
            <div className="text-2xl font-black text-foreground mt-1">{SOURCES.length - 1}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Direct live syndication</div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => { setQuickDate("upcoming"); setPage(1); }}
          className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm dark:shadow-md cursor-pointer hover:border-[#c9a84c]/50 transition-all group"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Upcoming IP Events</div>
              <Calendar className="w-3.5 h-3.5 text-[#9a751a] dark:text-amber-400" />
            </div>
            <div className="text-2xl font-black text-[#9a751a] dark:text-amber-400 mt-1 flex items-center gap-1.5">
              {upcomingEventsCount || upcomingEvents.length || 6}
              <span className="text-[11px] font-mono font-medium text-muted-foreground">Scheduled</span>
            </div>
            <div className="text-[10px] text-amber-700 dark:text-[#c9a84c] mt-1 flex items-center gap-1 font-medium">
              PTAB • EPO • WIPO • CAFC
            </div>
          </CardContent>
        </Card>

        <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm dark:shadow-md">
          <CardContent className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Executive Synthesis</div>
            <div className="text-2xl font-black text-[#9a751a] dark:text-[#c9a84c] mt-1">Enabled</div>
            <div className="text-[10px] text-muted-foreground mt-1">MOAT Executive Summaries</div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="space-y-4 bg-card dark:bg-[#14140b] p-5 rounded-lg border border-border dark:border-[#c9a84c]/20 shadow-sm dark:shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search headline, summary, patent office or keywords (e.g. AI, PTAB, unitary)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9 bg-background dark:bg-[#0d0d08] border-input dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] placeholder:text-muted-foreground dark:placeholder:text-[#e8dfc8]/40 h-10 text-xs focus:border-[#c9a84c] rounded-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Sort Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center bg-secondary dark:bg-[#0d0d08] rounded border border-border dark:border-[#c9a84c]/30 p-0.5">
              <button
                type="button"
                onClick={() => { setSortOrder("latest"); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-all ${
                  sortOrder === "latest"
                    ? "bg-[#175a74] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Latest First
              </button>
              <button
                type="button"
                onClick={() => { setSortOrder("oldest"); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm transition-all ${
                  sortOrder === "oldest"
                    ? "bg-[#175a74] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Oldest First
              </button>
            </div>
          </div>
        </div>

        {/* Quick Date Timeline Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border dark:border-[#c9a84c]/10 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-[#c9a84c]/80 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#9a751a] dark:text-[#c9a84c]" />
            Timeline:
          </span>
          {[
            { id: "all", label: "All Dates" },
            { id: "today", label: "Published Today", highlight: true },
            { id: "upcoming", label: "Upcoming Events & Hearings", highlight: true, count: upcomingEventsCount || upcomingEvents.length || 6 },
            { id: "48h", label: "Last 48 Hours" },
            { id: "7d", label: "Past 7 Days" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setQuickDate(item.id as any);
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              className={`px-3 py-1 text-xs rounded-sm border transition-all flex items-center gap-1.5 ${
                quickDate === item.id
                  ? "bg-[#175a74] text-white font-bold border-[#175a74] shadow-xs"
                  : "bg-background dark:bg-[#0d0d08] text-muted-foreground hover:text-foreground border-border dark:border-[#c9a84c]/20"
              }`}
            >
              {item.id === "today" && <Sparkles className="w-3 h-3 text-amber-500" />}
              {item.id === "upcoming" && <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  quickDate === item.id ? "bg-black/20 text-black font-bold" : "bg-amber-500/15 text-[#9a751a] dark:text-amber-300 font-bold"
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`h-7 text-xs border border-border dark:border-[#c9a84c]/20 gap-1 ml-auto ${
              showDateFilter || dateFrom || dateTo ? "border-[#c9a84c] text-[#9a751a] dark:text-[#c9a84c] bg-[#c9a84c]/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{dateFrom || dateTo ? "Custom Range Active" : "Custom Range"}</span>
          </Button>
        </div>

        {/* Date Filter Collapsible Row */}
        {showDateFilter && (
          <div className="pt-3 border-t border-border dark:border-[#c9a84c]/10 flex flex-wrap items-center gap-4 text-xs text-foreground dark:text-[#e8dfc8]">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[#9a751a] dark:text-[#c9a84c]">Published Between:</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setQuickDate("all"); setPage(1); }}
                className="bg-background dark:bg-[#0d0d08] border-input dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] h-8 text-xs w-36 rounded-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setQuickDate("all"); setPage(1); }}
                className="bg-background dark:bg-[#0d0d08] border-input dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] h-8 text-xs w-36 rounded-sm"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                className="h-8 text-[11px] text-[#9a751a] dark:text-amber-400 hover:underline"
              >
                Clear Dates
              </Button>
            )}
          </div>
        )}

        {/* Source Pills */}
        <div className="space-y-2 pt-2 border-t border-border dark:border-[#c9a84c]/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-[#c9a84c]/80">Filter By Source:</div>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((source) => {
              const isSelected = selectedSource === source;
              const count = source === "All"
                ? total
                : sourceCounts.find((s) => s.name.toLowerCase() === source.toLowerCase())?.count || 0;

              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => {
                    setSelectedSource(source);
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs rounded-sm border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#175a74] text-white font-black border-[#175a74] shadow-xs"
                      : "bg-background dark:bg-[#0d0d08] text-foreground dark:text-[#e8dfc8]/70 border-border dark:border-[#c9a84c]/20 hover:border-[#c9a84c] hover:text-foreground"
                  }`}
                >
                  <span>{source}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? "bg-black/20 text-black font-bold"
                        : "bg-muted dark:bg-[#c9a84c]/20 text-muted-foreground dark:text-amber-300"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills */}
        <div className="space-y-2 pt-2 border-t border-border dark:border-[#c9a84c]/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-[#c9a84c]/80">Filter By Category:</div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded-sm transition-all border ${
                    isSelected
                      ? "bg-[#175a74] text-white font-bold border-[#175a74] shadow-xs"
                      : "bg-background dark:bg-[#0d0d08] text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-[#1a1a0e] border-border dark:border-[#c9a84c]/10"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
          <Button
            size="sm"
            onClick={() => fetchNews(true)}
            className="bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/30 text-xs"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Upcoming Events & Hearings Radar Widget (Shown if events exist and not already in upcoming-only view) */}
      {upcomingEvents.length > 0 && quickDate !== "upcoming" && (
        <div className="bg-card dark:bg-gradient-to-r dark:from-[#1b1709] dark:via-[#14140b] dark:to-[#17140b] border border-amber-500/30 dark:border-[#c9a84c]/30 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border dark:border-[#c9a84c]/15 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-500/10 dark:bg-[#c9a84c]/15 text-[#9a751a] dark:text-[#c9a84c] rounded border border-amber-500/20">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black tracking-wide uppercase text-foreground dark:text-[#e8dfc8]">
                    Upcoming IP Events & Hearings Radar
                  </h2>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-[10px] font-mono px-1.5 py-0 font-bold">
                    {upcomingEventsCount || upcomingEvents.length} SCHEDULED
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scheduled PTAB oral hearings, EPO opposition deadlines, CAFC arguments, and regulatory effective dates.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuickDate("upcoming");
                setPage(1);
              }}
              className="h-7 text-xs border-amber-500/40 text-[#9a751a] dark:text-[#c9a84c] hover:bg-[#c9a84c]/10"
            >
              <span>View All Events ({upcomingEventsCount || upcomingEvents.length})</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.slice(0, 3).map((event) => {
              const eventDateStr = formatEventDate(event.event_date);
              return (
                <div
                  key={event.id}
                  className="bg-background dark:bg-[#0e0e07] border border-border dark:border-[#c9a84c]/20 hover:border-amber-500/60 dark:hover:border-[#c9a84c]/60 rounded-md p-4 flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-black text-amber-700 dark:text-[#c9a84c] bg-amber-500/10 dark:bg-[#c9a84c]/15 px-2 py-0.5 rounded border border-amber-500/30">
                        📅 {eventDateStr}
                      </span>
                      <Badge variant="outline" className={`text-[9px] font-mono font-black uppercase ${getSourceBadgeStyle(event.source_name)}`}>
                        {event.source_name}
                      </Badge>
                    </div>

                    <Link href={`/dashboard/ceo/news/${event.id}`} className="block">
                      <h4 className="text-xs font-bold text-foreground group-hover:text-[#9a751a] dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                        {event.title}
                      </h4>
                    </Link>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {event.summary}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border dark:border-[#c9a84c]/10 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Impact: {event.impact_level || "HIGH"}
                    </span>
                    <Link
                      href={`/dashboard/ceo/news/${event.id}`}
                      className="font-bold text-[#9a751a] dark:text-[#c9a84c] hover:underline flex items-center gap-1"
                    >
                      <span>Read Intelligence</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#16160d] p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24 bg-muted dark:bg-white/5" />
                <Skeleton className="h-4 w-20 bg-muted dark:bg-white/5" />
              </div>
              <Skeleton className="h-6 w-full bg-muted dark:bg-white/5" />
              <Skeleton className="h-4 w-3/4 bg-muted dark:bg-white/5" />
              <Skeleton className="h-16 w-full bg-muted dark:bg-white/5" />
              <div className="pt-4 border-t border-border dark:border-white/5 flex justify-between">
                <Skeleton className="h-4 w-24 bg-muted dark:bg-white/5" />
                <Skeleton className="h-4 w-20 bg-muted dark:bg-white/5" />
              </div>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 bg-card dark:bg-[#14140b] rounded-lg border border-border dark:border-[#c9a84c]/20 p-8 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No IP news available for the selected filters.</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your search terms, clearing category filters, or synchronizing with external sources.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="border-[#c9a84c]/40 text-[#9a751a] dark:text-[#c9a84c] hover:bg-[#c9a84c]/10 text-xs"
            >
              Reset All Filters
            </Button>
            <Button
              onClick={() => fetchNews(true)}
              size="sm"
              className="bg-[#175a74] hover:bg-[#114459] text-white font-bold text-xs"
            >
              Sync Fresh News
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const pubDateDisplay = formatPublishedDate(article.published_at);
            const isNew = isArticleNewToday(article.published_at);
            const isUpcoming = !!article.is_upcoming_event || (!!article.event_date && new Date(article.event_date).getTime() >= (Date.now() - 24 * 60 * 60 * 1000));
            const eventDateDisplay = formatEventDate(article.event_date);

            return (
              <Card
                key={article.id}
                className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#18180e] dark:to-[#121208] shadow-sm hover:shadow-md dark:shadow-lg hover:border-[#c9a84c]/60 dark:hover:border-[#c9a84c]/50 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Subtle top indicator for articles published today or upcoming events */}
                {isUpcoming ? (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
                ) : isNew ? (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-[#c9a84c] to-amber-500" />
                ) : null}

                <CardHeader className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${getCategoryBadgeStyle(article.category)}`}
                    >
                      {article.category}
                    </Badge>
                    
                    <div className="flex items-center gap-1.5">
                      {isUpcoming ? (
                        <Badge
                          variant="outline"
                          className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-sm flex items-center gap-1"
                        >
                          <Calendar className="w-2.5 h-2.5 text-purple-500" />
                          UPCOMING EVENT
                        </Badge>
                      ) : isNew ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-sm flex items-center gap-1 animate-pulse"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          NEW TODAY
                        </Badge>
                      ) : null}
                      
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border ${getSourceBadgeStyle(article.source_name)}`}
                      >
                        {article.source_name}
                      </Badge>
                    </div>
                  </div>

                  <Link href={`/dashboard/ceo/news/${article.id}`} className="block">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-[#9a751a] dark:group-hover:text-amber-400 transition-colors leading-snug line-clamp-3">
                      {article.title}
                    </h3>
                  </Link>
                </CardHeader>

                <CardContent className="p-5 pt-0 pb-4 flex-1">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {article.summary}
                  </p>

                  {/* MOAT Relevance & Impact */}
                  <div className="mt-3 p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase tracking-wider text-blue-600">
                        MOAT Relevance: {article.relevance_level || "HIGH"}
                      </span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        Impact: {article.impact_level || "HIGH"}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2">
                      {article.relevance_reason || "Directly intersects with active innovation disclosures in neuromorphic and quantum computing."}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-3 border-t border-border dark:border-[#c9a84c]/10 flex items-center justify-between text-xs text-muted-foreground bg-secondary/30 dark:bg-black/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {isUpcoming && eventDateDisplay ? "Scheduled Event Date" : "Published"}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-foreground/90 flex items-center gap-1" title={isUpcoming && article.event_date ? article.event_date : article.published_at}>
                      {isUpcoming && eventDateDisplay ? `📅 ${eventDateDisplay}` : pubDateDisplay}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/ceo/news/${article.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9a751a] dark:text-amber-400 hover:text-[#7d5f1b] dark:hover:text-amber-300 hover:underline"
                  >
                    <span>{isUpcoming ? "Read Event Intelligence" : "Read Intelligence"}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border dark:border-[#c9a84c]/20">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-bold text-foreground">{(page - 1) * 12 + 1}</span> to{" "}
            <span className="font-bold text-foreground">{Math.min(page * 12, total)}</span> of{" "}
            <span className="font-bold text-foreground">{total}</span> articles
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-secondary dark:hover:bg-[#c9a84c]/10 text-xs h-8"
            >
              Previous
            </Button>

            <span className="text-xs font-mono text-[#9a751a] dark:text-[#c9a84c] px-3 font-bold">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-secondary dark:hover:bg-[#c9a84c]/10 text-xs h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import dynamic from 'next/dynamic';
export default dynamic(() => Promise.resolve(CeoNewsPageContent), { ssr: false });
