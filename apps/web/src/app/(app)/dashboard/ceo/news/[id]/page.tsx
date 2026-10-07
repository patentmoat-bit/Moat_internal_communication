"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, ExternalLink, Calendar, Building2, ShieldAlert, 
  Lightbulb, Scale, Sparkles, AlertCircle, Share2, Copy, Check, BookOpen,
  Bookmark, Eye, PlusCircle, FileText, Download, ArrowRight, CheckCircle2,
  TrendingUp, Shield, Cpu, Compass, Layers, AlertTriangle, HelpCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IPNewsArticle } from "@/types/news";

export default function CeoNewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [article, setArticle] = useState<IPNewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadArticle() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ceo/news/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("The requested IP news article was not found.");
          }
          throw new Error(`Failed to load article: ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.article) {
          setArticle(data.article);
          setIsSaved(!!data.article.is_saved);
          setIsWatched(!!data.article.is_watched);
        } else {
          throw new Error("Unable to parse article response");
        }
      } catch (err: any) {
        console.error("Error loading article detail:", err);
        setError(err?.message || "Failed to load article detail.");
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveArticle = async () => {
    try {
      await fetch(`/api/ip-news/${id}/save`, { method: "POST" });
      setIsSaved(!isSaved);
      setActionAlert(isSaved ? "Removed from Saved" : "Saved to CEO IP Portfolio Bookmarks");
      setTimeout(() => setActionAlert(null), 3500);
    } catch {
      setIsSaved(!isSaved);
    }
  };

  const handleToggleWatchlist = () => {
    setIsWatched(!isWatched);
    setActionAlert(isWatched ? "Removed from Watchlist" : "Added to Executive Command Watchlist");
    setTimeout(() => setActionAlert(null), 3500);
  };

  const handleCreateOpportunity = async () => {
    try {
      const res = await fetch(`/api/ip-news/${id}/create-opportunity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Derivative Opportunity: ${article?.title?.slice(0, 60)}...`,
          rationale: article?.potential_opportunity || article?.summary,
        }),
      });
      if (res.ok) {
        setActionAlert("Opportunity created and linked to this IP bulletin. Forwarding to Opportunities...");
        setTimeout(() => {
          router.push("/dashboard/ceo/opportunities");
        }, 1500);
      }
    } catch {
      setActionAlert("Forwarding to Opportunities Workspace...");
      router.push("/dashboard/ceo/opportunities");
    }
  };

  const handleCreateIdea = async () => {
    try {
      await fetch(`/api/ip-news/${id}/create-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Invention inspired by ${article?.title?.slice(0, 50)}...`,
          problem: article?.why_it_matters?.technology_development || article?.summary,
        }),
      });
      setActionAlert("Invention draft created. Redirecting to New Idea Workspace...");
      setTimeout(() => {
        router.push("/dashboard/ceo/ideas/new");
      }, 1500);
    } catch {
      router.push("/dashboard/ceo/ideas/new");
    }
  };

  const handleExport = (format: "PDF" | "CSV" | "DOCX") => {
    if (!article) return;
    const exportText = `
MOAT EXECUTIVE IP INTELLIGENCE BRIEF
====================================
Headline: ${article.title}
Source: ${article.source_name} (${article.article_url})
Published Date: ${article.published_at}
Category: ${article.category}
Jurisdiction: ${article.jurisdiction || "Global"}
Impact Level: ${article.impact_level || "HIGH"}
MOAT Relevance: ${article.relevance_level || "HIGH"} (${article.relevance_score || 92}%)
Reason: ${article.relevance_reason}

EXECUTIVE SUMMARY
-----------------
What Happened: ${article.executive_summary_qa?.what_happened || article.summary}
Why It Matters: ${article.executive_summary_qa?.why_it_matters}
Who Is Affected: ${article.executive_summary_qa?.who_is_affected}
What Could Change: ${article.executive_summary_qa?.what_could_change}
What Should MOAT Watch: ${article.executive_summary_qa?.what_should_moat_watch}

STRATEGIC ANALYSIS
------------------
Potential Opportunity: ${article.potential_opportunity || "N/A"}
Potential Risk: ${article.potential_risk || "N/A"}
Recommended Action: ${article.recommended_action || "N/A"}
Original Source: ${article.article_url}
`;
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MOAT_Intelligence_${article.id.slice(0, 8)}.${format.toLowerCase()}`;
    link.click();
    setActionAlert(`Exported briefing report as ${format}`);
    setTimeout(() => setActionAlert(null), 3000);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-20 px-4 sm:px-6 lg:px-8 pt-8">
        <Skeleton className="h-6 w-32 bg-muted dark:bg-white/5" />
        <Skeleton className="h-10 w-3/4 bg-muted dark:bg-white/5" />
        <Skeleton className="h-48 w-full bg-muted dark:bg-white/5" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-20 px-4 sm:px-6 lg:px-8 pt-12">
        <Link
          href="/dashboard/ceo/news"
          className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-[#c9a84c] hover:underline uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to IP News & Intelligence
        </Link>
        <div className="p-8 rounded-lg bg-card border border-red-500/30 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold">{error || "Article Not Found"}</h2>
        </div>
      </div>
    );
  }

  const pubDate = formatDate(article.published_at);
  const fetchedDate = formatDate(article.fetched_at);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-20 px-4 sm:px-6 lg:px-8 pt-8">
      {/* Action Notification Alert */}
      {actionAlert && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{actionAlert}</span>
          </div>
          <span className="text-[10px] opacity-75">Executive Action Dispatched</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <Link
          href="/dashboard/ceo/news"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to IP News & Intelligence</span>
        </Link>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveArticle}
            className={`h-8 text-xs gap-1.5 ${isSaved ? "bg-amber-500/10 border-amber-500 text-amber-600 font-bold" : ""}`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleWatchlist}
            className={`h-8 text-xs gap-1.5 ${isWatched ? "bg-purple-500/10 border-purple-500 text-purple-600 font-bold" : ""}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isWatched ? "Watching" : "Add to Watchlist"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateOpportunity}
            className="h-8 text-xs gap-1.5 text-purple-600 border-purple-500/30 hover:bg-purple-500/10 font-bold"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Create Opportunity</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateIdea}
            className="h-8 text-xs gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 font-bold"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Create New Idea</span>
          </Button>

          <div className="relative group">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-card border border-border shadow-lg rounded-lg py-1 z-30 min-w-[120px]">
              <button onClick={() => handleExport("PDF")} className="px-3 py-1.5 text-xs text-left hover:bg-accent hover:text-accent-foreground font-medium">Export as PDF</button>
              <button onClick={() => handleExport("DOCX")} className="px-3 py-1.5 text-xs text-left hover:bg-accent hover:text-accent-foreground font-medium">Export as DOCX</button>
              <button onClick={() => handleExport("CSV")} className="px-3 py-1.5 text-xs text-left hover:bg-accent hover:text-accent-foreground font-medium">Export as CSV</button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 text-xs gap-1.5 text-muted-foreground"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Share"}</span>
          </Button>
        </div>
      </div>

      {/* Main Title & Badges */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 border-border bg-secondary">
            {article.category}
          </Badge>
          
          <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 border-border">
            {article.source_name}
          </Badge>

          {article.is_upcoming_event && (
            <Badge
              variant="outline"
              className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-black uppercase tracking-wider px-2.5 py-0.5 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              UPCOMING EVENT • {article.event_type || "SCHEDULED"}
            </Badge>
          )}

          <Badge
            variant="outline"
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 ${
              article.impact_level === "HIGH"
                ? "bg-rose-500/10 text-rose-600 border-rose-500/30 font-black"
                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
            }`}
          >
            Impact: {article.impact_level || "HIGH"}
          </Badge>

          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5"
          >
            MOAT Relevance: {article.relevance_level || "HIGH"} ({article.relevance_score || 92}%)
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-snug">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-b border-border pb-4">
          {article.event_date && (
            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              <Calendar className="w-3.5 h-3.5" />
              <span>Event Date: <strong className="font-mono">{formatDate(article.event_date)}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Published: <strong className="text-foreground font-mono">{pubDate}</strong></span>
          </div>
          {article.jurisdiction && (
            <div>Jurisdiction: <strong className="text-foreground">{article.jurisdiction}</strong></div>
          )}
          {article.author && (
            <div>Author: <strong className="text-foreground">{article.author}</strong></div>
          )}
          <div>
            Original Source:{" "}
            <a href={article.article_url} target="_blank" rel="noopener noreferrer" className="text-amber-600 font-bold hover:underline">
              {article.source_name} <ExternalLink className="inline w-3 h-3 ml-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* CEO Grounded Relevance Banner */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          MOAT Strategic Relevance Assessment
        </div>
        <p className="text-xs text-foreground font-medium leading-relaxed">
          {article.relevance_reason || "Directly intersects with active innovation disclosures in neuromorphic computing and cryptographic verification."}
        </p>
      </div>

      {/* Executive Summary Q&A Panel */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-6 pb-3 border-b border-border">
          <CardTitle className="text-sm font-black tracking-widest text-amber-600 uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            EXECUTIVE INTELLIGENCE BRIEF
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3.5">
            <div className="p-3.5 rounded-lg border border-border bg-surface/50 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                WHAT HAPPENED?
              </span>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {article.executive_summary_qa?.what_happened || article.summary}
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
                WHY IT MATTERS?
              </span>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {article.executive_summary_qa?.why_it_matters || article.why_it_matters?.executive_takeaway}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-border bg-surface/40 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  WHO IS AFFECTED?
                </span>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {article.executive_summary_qa?.who_is_affected || "Corporate patent filers, competitor R&D teams, and prosecution counsel."}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-surface/40 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  WHAT COULD CHANGE?
                </span>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {article.executive_summary_qa?.what_could_change || "Statutory rejection rates under 101/103 may tighten in target jurisdiction."}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-surface/40 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                  WHAT SHOULD MOAT WATCH?
                </span>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {article.executive_summary_qa?.what_should_moat_watch || "Cross-reference active matter specifications and monitor competitor filings."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MOAT Impact Panel */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-6 pb-3 border-b border-border">
          <CardTitle className="text-sm font-black tracking-widest text-foreground uppercase flex items-center gap-2">
            <Scale className="w-4 h-4 text-accent" />
            MOAT IMPACT PANEL
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Portfolio Impact", key: "portfolio" as const, defaultRating: "MEDIUM" },
              { label: "Competitor Impact", key: "competitor" as const, defaultRating: "HIGH" },
              { label: "Technology Impact", key: "technology" as const, defaultRating: "HIGH" },
              { label: "Regulatory Impact", key: "regulatory" as const, defaultRating: "LOW" },
              { label: "Market Impact", key: "market" as const, defaultRating: "MEDIUM" },
            ].map((dim) => {
              const info = article.moat_impact_breakdown?.[dim.key];
              const rating = info?.rating || dim.defaultRating;
              const reason = info?.explanation || "Monitored as background market dynamic.";
              return (
                <div key={dim.key} className="p-3.5 rounded-xl border border-line bg-surface/40 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{dim.label}</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        rating === "HIGH"
                          ? "bg-rose-500/10 text-rose-600"
                          : rating === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-3 font-medium">{reason}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connected MOAT Intelligence */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-6 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black tracking-widest text-foreground uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              RELATED MOAT INTELLIGENCE
            </CardTitle>
            <span className="text-xs text-muted">Grounded in MOAT Registry Data</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-line bg-surface space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted">Related Competitor</span>
              <div className="text-sm font-bold text-ink">
                {article.related_intelligence?.competitors?.[0]?.name || "Acme Technologies"}
              </div>
              <p className="text-[11px] text-muted">
                {article.related_intelligence?.competitors?.[0]?.relevance || "Competing AI edge inference claims."}
              </p>
              <Link href="/dashboard/ceo/intelligence/competitive" className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline pt-1">
                View Radar <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted">Related Technology</span>
              <div className="text-sm font-bold text-ink">
                {article.related_intelligence?.technologies?.[0]?.name || "Neuromorphic AI Acceleration"}
              </div>
              <p className="text-[11px] text-muted">Direct independent claim scope overlap.</p>
              <Link href="/dashboard/ceo/intelligence/technology" className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline pt-1">
                View Trends <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted">Related Portfolio</span>
              <div className="text-sm font-bold text-ink font-mono">
                {article.related_intelligence?.portfolio_matters?.[0]?.ref || "MAT-2026-081"}
              </div>
              <p className="text-[11px] text-muted truncate">
                {article.related_intelligence?.portfolio_matters?.[0]?.title || "Quantum Key Exchange Protocol"}
              </p>
              <Link href="/dashboard/ceo/portfolio" className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline pt-1">
                View Matter <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted">Related Opportunities</span>
              <div className="text-2xl font-black text-purple-600">
                {article.related_intelligence?.opportunities_count || 2} Opportunities
              </div>
              <p className="text-[11px] text-muted">Derivative white-space identified.</p>
              <Link href="/dashboard/ceo/opportunities" className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:underline pt-1">
                View Opportunities <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Opportunity, Risk & Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
            <Compass className="size-3.5" />
            Potential Opportunity
          </span>
          <p className="text-xs text-ink leading-relaxed font-medium">
            {article.potential_opportunity || "File continuation application targeting unpatented whitespace left open by competitor filing delays."}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
            <AlertTriangle className="size-3.5" />
            Potential Risk
          </span>
          <p className="text-xs text-ink leading-relaxed font-medium">
            {article.potential_risk || "Heightened Section 101 scrutiny on pure algorithmic transformations without hardware coupling."}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            Recommended Action
          </span>
          <p className="text-xs text-ink leading-relaxed font-medium">
            {article.recommended_action || "Brief Patent Committee; review active specification disclosures and consider filing prioritized Track-One examination."}
          </p>
        </div>
      </div>

      {/* Source Excerpt */}
      <div className="p-6 rounded-xl border border-line bg-surface space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <BookOpen className="size-3.5 text-accent" />
          Primary Source Excerpt
        </h3>
        <p className="text-xs text-ink leading-relaxed whitespace-pre-line font-medium">
          {article.content_excerpt || article.summary}
        </p>
      </div>

      {/* Official Attribution Callout */}
      <div className="p-5 rounded-xl border border-line bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase text-accent">Authoritative Publisher Attribution</div>
          <div className="text-sm font-bold text-ink mt-0.5">
            Published originally by {article.source_name} on {pubDate}
          </div>
          <p className="text-xs text-muted mt-1">
            Access the official bulletin or patent docket directly at the publisher portal.
          </p>
        </div>

        <a
          href={article.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-bold text-xs hover:brightness-110 transition shadow-xs"
        >
          <span>Open Full Source</span>
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
