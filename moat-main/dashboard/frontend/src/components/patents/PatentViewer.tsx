"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast, useToast } from "@/components/ui/toast"
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast"
import {
  Search,
  LayoutDashboard,
  Bookmark,
  FolderKanban,
  Settings,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Scale,
  FileText,
  ImageIcon,
  Link2,
  BookOpen,
  User,
  Building2,
  Clock,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  ChevronLeft,
  Palette,
  Bot,
  Send,
  X,
  Loader2,
} from "lucide-react"

const HARDCODED_PATENT = {
  id: "US10986106B2",
  patentNumber: "US10986106B2",
  title: "Technology-addressing convergence and integration framework for data indexing, search, and analysis across multiple data sources",
  abstract:
    "Methods, systems, and apparatus, including computer programs encoded on a storage device, for integrating, indexing, and searching across multiple disparate data sources. A convergence framework provides a unified interface for querying structured and unstructured data across cloud-based and on-premises data stores. The framework includes a data ingestion pipeline that normalizes data from diverse sources into a common schema, an indexing engine that builds integrated search indexes, and a query processor that executes cross-source searches with relevance ranking and facet generation.",
  assignee: "Splunk Inc.",
  inventors: ["Sudhakar Muddu", "R. David C. C. Shrader", "Michael Baum"],
  filingDate: "2019-01-31",
  publicationDate: "2021-03-30",
  priorityDate: "2019-01-31",
  status: "Granted",
  matchScore: 95,
  cpcClassifications: ["G06F 16/9038", "G06F 16/907", "G06F 16/93"],
  ipcClassifications: ["G06F 16/90"],
  claims: [
    "A method for unified data indexing across multiple disparate data sources, comprising: receiving data from a plurality of data sources, each data source having a distinct schema; transforming the received data into a normalized format conforming to a common schema; building an integrated search index from the normalized data; receiving a cross-source search query; and executing the query against the integrated search index to return results ranked by relevance.",
    "The method of claim 1, wherein the plurality of data sources includes at least one cloud-based data store and at least one on-premises data store.",
    "The method of claim 1, further comprising generating facets from the normalized data for faceted navigation of search results.",
    "The method of claim 1, wherein the common schema comprises a field mapping layer that preserves source-specific metadata.",
    "A system for unified data indexing, comprising: a data ingestion module configured to receive and normalize data from a plurality of disparate data sources; an indexing engine configured to build an integrated search index; a query processor configured to execute cross-source queries against the index; and a relevance ranking module configured to score results based on cross-source signals.",
  ],
  citedPatents: [
    { number: "US9424294B2", title: "Data integration and indexing across multiple data sources" },
    { number: "US10185743B2", title: "Search across heterogeneous data sources" },
    { number: "US9639589B1", title: "Cross-source data normalization and search" },
    { number: "US20180357270A1", title: "Unified data indexing framework" },
  ],
  citedBy: [
    { number: "US20220147492A1", title: "Multi-source data convergence platform" },
  ],
  description:
    "The present disclosure relates to systems and methods for integrating, indexing, and searching data across multiple disparate data sources.\n\nIn modern enterprise environments, data is often stored across a variety of disparate systems, including cloud-based data warehouses, on-premises databases, document stores, and streaming data platforms. Each of these systems typically has its own schema, query interface, and data model, making it difficult to perform unified search and analysis across the entire data landscape.\n\nExisting approaches to cross-source data integration often require custom connectors, ETL pipelines, and complex middleware that are time-consuming to build and maintain. Moreover, these approaches typically lack the ability to provide real-time search across all data sources with consistent relevance ranking.\n\nThe technology-addressing convergence and integration framework described herein addresses these challenges by providing a unified data ingestion pipeline, a common schema for normalized data, an integrated search index, and a query processor that can execute cross-source searches with relevance ranking and facet generation.",
  legalEvents: [
    { date: "2019-01-31", type: "filing", description: "Application filed with USPTO" },
    { date: "2020-07-15", type: "publication", description: "Patent application published" },
    { date: "2021-03-30", type: "grant", description: "Patent granted" },
  ],
  patentFamily: [
    { patent_number: "US10986106B2", country: "US", kind: "B2", publication_date: "2021-03-30", title: "Technology-addressing convergence and integration framework" },
    { patent_number: "WO2020154321A1", country: "WO", kind: "A1", publication_date: "2020-07-30", title: "Convergence and integration framework" },
  ],
  images: [
    { url: "/placeholder-fig1.svg", caption: "FIG. 1 — Architecture diagram of the convergence and integration framework", figure_number: "1" },
    { url: "/placeholder-fig2.svg", caption: "FIG. 2 — Data ingestion pipeline flow with normalization stages", figure_number: "2" },
    { url: "/placeholder-fig3.svg", caption: "FIG. 3 — Integrated search index structure and query execution", figure_number: "3" },
  ],
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Search, label: "Search", href: "/dashboard/search" },
  { icon: Bookmark, label: "Saved", href: "/dashboard/saved" },
  { icon: FolderKanban, label: "Collections", href: "/dashboard/collections" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

const HIGHLIGHT_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA",
]

type PatentViewerData = {
  id: string
  patentNumber: string
  title: string
  abstract: string
  assignee: string
  inventors: string[]
  filingDate: string
  publicationDate: string
  priorityDate?: string
  status: string
  matchScore?: number
  cpcClassifications: string[]
  ipcClassifications: string[]
  claims: string[]
  citedPatents: { number: string; title: string }[]
  citedBy?: { number: string; title: string }[]
  description?: string
  legalEvents?: { date: string; type: string; description: string }[]
  patentFamily?: { patent_number: string; country: string; kind: string; publication_date: string; title: string }[]
  images?: { url: string; caption: string; figure_number?: string }[]
}

interface PatentViewerProps {
  patent?: PatentViewerData | null
  loading?: boolean
  className?: string
}

function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant as "default" | "destructive" | "success" | undefined}>
          <div className="grid gap-1">
            {t.title && <ToastTitle>{t.title}</ToastTitle>}
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

function TimelineDot({ active, isLatest }: { active: boolean; isLatest?: boolean }) {
  return (
    <motion.div
      className={cn(
        "w-2.5 h-2.5 rounded-full border-2 shrink-0 relative",
        active ? "border-[#4fc3f7] bg-[#4fc3f7]" : "border-zinc-600 bg-zinc-800"
      )}
      animate={isLatest ? {
        scale: [1, 1.3, 1],
        boxShadow: ["0 0 0 0 rgba(79, 195, 247, 0.4)", "0 0 0 6px rgba(79, 195, 247, 0)", "0 0 0 0 rgba(79, 195, 247, 0)"],
      } : {}}
      transition={isLatest ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      {isLatest && (
        <motion.span
          className="absolute inset-0 rounded-full bg-[#4fc3f7]"
          animate={{ opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  )
}

export function PatentViewer({
  patent: externalPatent,
  loading = false,
  className,
}: PatentViewerProps) {
  const patent = externalPatent ?? HARDCODED_PATENT
  const [activeTab, setActiveTab] = React.useState("abstract")
  const [selectedFigure, setSelectedFigure] = React.useState(0)
  const [zoomLevel, setZoomLevel] = React.useState(1)
  const [saved, setSaved] = React.useState(false)
  const [matchScore, setMatchScore] = React.useState(0)
  const [highlightColors, setHighlightColors] = React.useState<string[]>(HIGHLIGHT_COLORS)
  const [openColorIndex, setOpenColorIndex] = React.useState<number | null>(null)
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string>>({});

  // Copilot state
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollChat = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  React.useEffect(() => { scrollChat(); }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ patent_id: patent.id, messages: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please check your backend is running." }]);
    } finally {
      setChatLoading(false);
    }
  };

  React.useEffect(() => {
    const score = patent.matchScore ?? 95
    const timer = setTimeout(() => setMatchScore(score), 300)
    return () => clearTimeout(timer)
  }, [patent.matchScore])

  const handleSave = () => {
    setSaved(true)
    toast({
      title: "Patent Saved",
      description: `US10986106B2 has been saved to your library.`,
      variant: "success",
    })
  }

  const handleReset = () => {
    setSaved(false)
    setHighlightColors(HIGHLIGHT_COLORS)
    setZoomLevel(1)
    setActiveFilters({})
    toast({
      title: "Reset Complete",
      description: "All view settings have been reset to default.",
    })
  }

  const handleColorChange = (index: number) => {
    setOpenColorIndex(openColorIndex === index ? null : index)
  }

  const applyColor = (index: number, color: string) => {
    const next = [...highlightColors]
    next[index] = color
    setHighlightColors(next)
    setOpenColorIndex(null)
  }

  const handleFigureClick = (index: number) => {
    setSelectedFigure(index)
    setZoomLevel(1)
  }

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5))

  const images = patent.images || []
  const currentImage = images[selectedFigure]

  const copilotSuggestions = [
    "What is the primary claim of this patent?",
    "Summarize key innovations in 3 bullets",
    "Who are the main competitors?",
    "What prior art is most relevant?",
  ]

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-screen bg-[#0d0d14]", className)}>
        <motion.div
          className="flex flex-col items-center gap-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Sparkles className="w-8 h-8 text-[#4fc3f7]" />
          <p className="text-sm text-zinc-500 font-mono">Loading patent data...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className={cn("flex h-screen bg-[#0d0d14] text-zinc-100 overflow-hidden", className)}>
        {/* Left Nav Sidebar */}
        <aside className="w-14 flex flex-col items-center py-4 gap-5 border-r border-zinc-800 bg-[#0d0d14] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#4fc3f7]/20 flex items-center justify-center mb-2">
            <Sparkles className="w-4 h-4 text-[#4fc3f7]" />
          </div>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-[#4fc3f7] hover:bg-[#4fc3f7]/10 transition-colors group relative"
            >
              <item.icon className="w-4 h-4" />
              <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-zinc-800 text-xs text-zinc-300 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-zinc-700">
                {item.label}
              </span>
            </a>
          ))}
        </aside>

        {/* Center Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 px-6 pt-4 pb-2 text-xs text-zinc-500 font-mono">
            <a href="/dashboard" className="hover:text-[#4fc3f7] transition-colors">Dashboard</a>
            <ChevronRight className="w-3 h-3" />
            <a href="/dashboard/search" className="hover:text-[#4fc3f7] transition-colors">Patents</a>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-300">{patent.patentNumber}</span>
          </div>

          {/* Back Button */}
          <div className="px-6 py-1">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#4fc3f7] transition-colors font-mono"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to results
            </button>
          </div>

          {/* Title Section */}
          <div className="px-6 pt-2 pb-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                {patent.patentNumber}
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider">
                NEW
              </span>
            </div>
            <h1
              className="text-2xl font-bold leading-tight text-zinc-100"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {patent.title}
            </h1>
          </div>

          {/* Tab Bar */}
          <div className="px-6 border-b border-zinc-800">
            <div className="flex gap-6 text-sm">
              {[
                { id: "abstract", label: "Abstract", icon: BookOpen },
                { id: "claims", label: "Claims", icon: Scale },
                { id: "description", label: "Description", icon: FileText },
                { id: "images", label: "Images", icon: ImageIcon },
                { id: "citations", label: "Citations", icon: Link2 },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 pb-2.5 pt-1 text-xs font-medium transition-colors relative",
                      activeTab === tab.id
                        ? "text-[#4fc3f7]"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4fc3f7]"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {/* Abstract */}
                {activeTab === "abstract" && (
                  <div className="space-y-4">
                    <h3
                      className="text-lg font-semibold text-zinc-100"
                      style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                      Abstract
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                      {patent.abstract}
                    </p>
                  </div>
                )}

                {/* Claims */}
                {activeTab === "claims" && (
                  <div className="space-y-4">
                    <h3
                      className="text-lg font-semibold text-zinc-100"
                      style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                      Claims
                    </h3>
                    <ol className="space-y-4">
                      {patent.claims.map((claim, index) => (
                        <li key={index} className="flex gap-3 text-sm">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-mono font-bold bg-[#4fc3f7]/10 text-[#4fc3f7] mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-zinc-400 leading-relaxed font-mono">{claim}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Description */}
                {activeTab === "description" && (
                  <div className="space-y-4">
                    <h3
                      className="text-lg font-semibold text-zinc-100"
                      style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                      Description
                    </h3>
                    <div className="space-y-3">
                      {patent.description?.split("\n\n").filter(Boolean).map((p, i) => (
                        <p key={i} className="text-sm text-zinc-400 leading-relaxed font-mono">
                          <span className="text-zinc-600 mr-2">[{i + 1}]</span>
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {activeTab === "images" && (
                  <div className="flex gap-4 h-[480px]">
                    {/* Thumbnail Filmstrip */}
                    <div className="w-20 flex flex-col gap-2 overflow-y-auto shrink-0 scrollbar-hide">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => handleFigureClick(i)}
                          className={cn(
                            "w-full aspect-[4/3] rounded-md border overflow-hidden flex items-center justify-center bg-zinc-900 transition-all",
                            selectedFigure === i
                              ? "border-[#4fc3f7] ring-1 ring-[#4fc3f7]/50"
                              : "border-zinc-700 hover:border-zinc-500"
                          )}
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-zinc-600" />
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Figure Viewer */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                      <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 flex items-center justify-center relative overflow-hidden">
                        <motion.div
                          animate={{ scale: zoomLevel }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="flex items-center justify-center w-full h-full"
                        >
                          <div className="w-3/4 h-3/4 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-zinc-700/50">
                            <ImageIcon className="w-12 h-12 text-zinc-700" />
                          </div>
                        </motion.div>

                        {/* Zoom Controls */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-zinc-900/90 rounded-lg border border-zinc-700 p-1">
                          <button
                            onClick={handleZoomOut}
                            className="w-7 h-7 rounded flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono text-zinc-500 w-8 text-center">
                            {Math.round(zoomLevel * 100)}%
                          </span>
                          <button
                            onClick={handleZoomIn}
                            className="w-7 h-7 rounded flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setZoomLevel(1)}
                            className="w-7 h-7 rounded flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Caption */}
                      {currentImage && (
                        <p className="text-xs text-zinc-500 font-mono text-center">
                          {currentImage.caption}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Citations */}
                {activeTab === "citations" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3
                        className="text-base font-semibold text-zinc-100 flex items-center gap-2"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                      >
                        <Link2 className="w-4 h-4 text-zinc-500" />
                        Cited Patents
                      </h3>
                      <div className="space-y-2">
                        {patent.citedPatents.map((p) => (
                          <div key={p.number} className="flex items-center gap-2 rounded-md border border-zinc-800 p-2.5 text-xs">
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0 text-zinc-400 border-zinc-700">
                              {p.number}
                            </Badge>
                            <span className="text-zinc-500 truncate">{p.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3
                        className="text-base font-semibold text-zinc-100 flex items-center gap-2"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                      >
                        <ExternalLink className="w-4 h-4 text-zinc-500" />
                        Cited By
                      </h3>
                      <div className="space-y-2">
                        {(patent.citedBy || []).map((p) => (
                          <div key={p.number} className="flex items-center gap-2 rounded-md border border-zinc-800 p-2.5 text-xs">
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0 text-zinc-400 border-zinc-700">
                              {p.number}
                            </Badge>
                            <span className="text-zinc-500 truncate">{p.title}</span>
                          </div>
                        ))}
                        {(!patent.citedBy || patent.citedBy.length === 0) && (
                          <p className="text-xs text-zinc-600 font-mono italic">No citations found</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Right Metadata Panel */}
        <aside className="w-80 border-l border-zinc-800 bg-[#0d0d14] flex flex-col overflow-y-auto scrollbar-hide shrink-0">
          <div className="p-4 space-y-4">
            {/* Copilot Button */}
            <button
              onClick={() => setCopilotOpen(true)}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-gradient-to-r from-[#b8921e] to-[#b8921e] hover:from-[#c9a84c] hover:to-[#c9a84c] text-white text-xs font-semibold shadow-lg shadow-[#c9a84c]/20 transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              AI Copilot
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-[#4fc3f7] text-xs h-8"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Original
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-[#4fc3f7] text-xs h-8"
              >
                <Search className="w-3 h-3 mr-1" />
                Prior Art
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-[#4fc3f7] text-xs h-8"
              >
                <Scale className="w-3 h-3 mr-1" />
                Similar
              </Button>
            </div>

            {/* Inventor / Assignee Info */}
            <div className="space-y-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="flex items-start gap-2.5">
                <User className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Inventors</p>
                  <p className="text-xs text-zinc-300 font-mono">{patent.inventors.join(", ")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Assignee</p>
                  <p className="text-xs text-zinc-300 font-mono">{patent.assignee}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Filed</p>
                  <p className="text-xs text-zinc-300 font-mono">{patent.filingDate}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 font-mono">
                <Clock className="w-3 h-3 text-[#4fc3f7]" />
                Timeline
              </h3>
              <div className="space-y-3">
                {(patent.legalEvents || []).map((event, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <TimelineDot active isLatest={i === (patent.legalEvents || []).length - 1} />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 font-mono">{event.date}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Score Progress Bar */}
            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-100 font-mono">Match Score</h3>
                <span className="text-xs font-mono font-bold text-[#4fc3f7]">{patent.matchScore ?? 95}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#4fc3f7] to-[#2e9bcf]"
                  initial={{ width: 0 }}
                  animate={{ width: `${matchScore}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>Relevance</span>
                <span>Confidence: High</span>
              </div>
            </div>

            {/* Highlight Color Swatches */}
            <div className="space-y-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-100 font-mono">Highlights</h3>
                <Palette className="w-3 h-3 text-zinc-500" />
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {highlightColors.map((color, i) => (
                  <div key={i} className="relative">
                    <button
                      onClick={() => handleColorChange(i)}
                      className={cn(
                        "w-full aspect-square rounded border transition-all",
                        openColorIndex === i ? "ring-2 ring-white/30 scale-110" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: color, borderColor: color }}
                      title={`H${i + 1}`}
                    />
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-zinc-600">
                      H{i + 1}
                    </span>
                    {openColorIndex === i && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenColorIndex(null)} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-zinc-800 rounded-lg border border-zinc-700 p-2 shadow-xl">
                          <div className="grid grid-cols-4 gap-1">
                            {["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA", "#ffffff", "#cccccc", "#999999", "#555555"].map((c) => (
                              <button
                                key={c}
                                onClick={() => applyColor(i, c)}
                                className={cn(
                                  "w-5 h-5 rounded border transition-transform hover:scale-125",
                                  c === color && "ring-2 ring-white/50"
                                )}
                                style={{ backgroundColor: c, borderColor: c === "#ffffff" ? "#666" : c }}
                              />
                            ))}
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-zinc-700">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => applyColor(i, e.target.value)}
                              className="w-full h-5 rounded cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save / Reset Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={handleSave}
                className={cn(
                  "text-xs h-9 font-mono",
                  saved
                    ? "bg-[#4fc3f7]/20 text-[#4fc3f7] border border-[#4fc3f7]/30 hover:bg-[#4fc3f7]/30"
                    : "bg-[#4fc3f7] text-black hover:bg-[#4fc3f7]/90"
                )}
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                {saved ? "Saved" : "Save"}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs h-9 font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
        </aside>
      </div>
      <Toaster />

      {/* Copilot Slide-out Panel */}
      <AnimatePresence>
        {copilotOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCopilotOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-[420px] flex flex-col bg-[#0d0d14] border-l border-zinc-800 shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Copilot Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#c9a84c]/10 to-[#8a6a1e]/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#b8921e] flex items-center justify-center shadow-lg shadow-[#c9a84c]/30">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Patent Copilot</h3>
                    <p className="text-[10px] text-zinc-500 font-mono">GPT-4o · Context-aware</p>
                  </div>
                </div>
                <button onClick={() => setCopilotOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {chatMessages.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-[#c9a84c]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                          Hello! I'm your Patent Copilot. I've read <span className="text-[#c9a84c] font-semibold">{patent.patentNumber}</span> and I'm ready to help you analyze it. Ask me anything!
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Suggested questions</p>
                      {copilotSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setChatInput(s); }}
                          className="w-full text-left text-xs text-zinc-400 hover:text-[#e8c97a] bg-zinc-900/50 hover:bg-[#c9a84c]/10 border border-zinc-800 hover:border-[#c9a84c]/30 rounded-xl px-3 py-2.5 transition-all font-mono"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.role === "user" ? "bg-zinc-800" : "bg-[#c9a84c]/15"
                    }`}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5 text-zinc-400" /> : <Bot className="w-3.5 h-3.5 text-[#c9a84c]" />}
                    </div>
                    <div className={`flex-1 rounded-xl px-3 py-2.5 text-xs leading-relaxed font-mono max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-zinc-800 text-zinc-200 ml-auto"
                        : "bg-zinc-900/50 border border-zinc-800 text-zinc-300"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/15 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-[#c9a84c]" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                      <Loader2 className="w-3 h-3 animate-spin text-[#c9a84c]" />
                      <span className="text-xs text-zinc-500 font-mono">Analyzing patent...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-zinc-800">
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Ask about claims, prior art, scope..."
                    rows={2}
                    className="flex-1 resize-none text-xs font-mono text-zinc-200 bg-zinc-900/50 border border-zinc-700 focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/25 rounded-xl px-3 py-2.5 placeholder:text-zinc-600 outline-none transition-all"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="w-9 h-9 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-[#c9a84c]/20 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 font-mono mt-2 text-center">Enter to send · Shift+Enter for newline</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ToastProvider>
  )
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
