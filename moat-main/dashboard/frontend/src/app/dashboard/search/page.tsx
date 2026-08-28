"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  SlidersHorizontal,
  Hash,
  Terminal,
  Bookmark,
  BookmarkCheck,
  GitCompare,
  FileJson,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Download,
  Info,
  Loader2,
  Trash2,
  GripVertical,
  Plus,
  HelpCircle,
  ListPlus,
  Brain,
  BookOpen,
  History,
  Type,
  AlignLeft,
  List,
  User,
  Landmark,
  Code,
  Users,
  Link as LinkIcon,
  Cpu,
  CalendarDays,
  Check,
  Search,
  FileText,
  Layers,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useSandboxStore } from "@/stores/sandboxStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { useHighlightStore } from "@/stores/highlightStore";
import { useAlertStore } from "@/stores/alertStore";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PatentDetailPanel } from "@/components/search/PatentDetailPanel";
import ComparisonPage from "@/app/dashboard/comparison/page";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/Toast";
import { SearchResultsSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useSearchStore } from "@/stores/searchStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADVANCED_SEARCH_MODES = [
  { id: "keyword", label: "Keyword" },
  { id: "semantic", label: "Semantic" },
  { id: "hybrid", label: "Hybrid" },
  { id: "boolean", label: "Boolean" },
  { id: "concept", label: "Concept" },
  { id: "claim", label: "Claim" },
  { id: "inventor", label: "Inventor" },
  { id: "assignee", label: "Assignee" },
  { id: "technology", label: "Technology" },
  { id: "family", label: "Family" },
  { id: "citation", label: "Citation" },
  { id: "classification", label: "CPC / IPC" },
  { id: "image", label: "Image" },
  { id: "drawing", label: "Drawing" },
  { id: "document", label: "Document" },
  { id: "multilanguage", label: "Multi-language" },
];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { searchPatents, savePatent, removePatent, savedPatents, isPatentSaved, supabase, recentSearches, researchProjects } = useApp();
  const { addRecentSearch } = useSearchStore();
  const { show } = useToast();

  const [activeTab, setActiveTab] = useState<string>("fielded");
  const [autoSaveQuery, setAutoSaveQuery] = useState(false);
  const [searchNotes, setSearchNotes] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [researchType, setResearchType] = useState("general");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [handoffMode, setHandoffMode] = useState<string | undefined>(undefined);
  const [handoffConcepts, setHandoffConcepts] = useState<string | undefined>(undefined);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [selectedPatents, setSelectedPatents] = useState<string[]>([]);

  // Search Query Builder State
  const [queryRows, setQueryRows] = useState([
    { id: "1", logic: "", field: "Title", operator: "Contains", value: "" },
    { id: "2", logic: "AND", field: "Publication date", operator: "Between", value: "" },
    { id: "3", logic: "AND", field: "Country code", operator: "Equals (=)", value: "" },
    { id: "4", logic: "AND", field: "Application number", operator: "Contains", value: "" },
    { id: "5", logic: "AND", field: "IPC (International Patent Classification)", operator: "Contains", value: "" },
    { id: "6", logic: "AND", field: "Assignees / Applicants", operator: "Contains", value: "" },
    { id: "7", logic: "AND", field: "Legal status", operator: "Equals (=)", value: "" },
    { id: "8", logic: "AND", field: "Cited (forward citations)", operator: "Contains", value: "" },
  ]);

  const addQueryRow = () => {
    setQueryRows([...queryRows, { id: Math.random().toString(), logic: "AND", field: "Title", operator: "Contains", value: "" }]);
  };

  const removeQueryRow = (id: string) => {
    setQueryRows(queryRows.filter(r => r.id !== id));
  };

  const updateQueryRow = (id: string, field: string, value: string) => {
    setQueryRows(queryRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  
  // Auto-save logic — persists the in-progress query draft locally so it
  // survives a refresh. Deliberately does NOT call handleSaveToProject: that
  // action requires a query name and shows user-facing error toasts when one
  // isn't set yet, which would fire repeatedly while the user is still typing.
  useEffect(() => {
    if (!autoSaveQuery) return;
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem("moat_search_query_draft", JSON.stringify({ queryRows, savedAt: Date.now() }));
      } catch {
        // Ignore storage errors (e.g. private browsing quota)
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [queryRows, autoSaveQuery]);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedPatent, setSelectedPatent] = useState<any | null>(null);
  
  // Sandbox
  const sandbox = useSandboxStore();
  // Auto Memory
  const memory = useMemoryStore();
  // Highlights
  const highlight = useHighlightStore();
  const activeScheme = highlight.getActiveScheme();
  // Alerts
  const alertStore = useAlertStore();
  
  // Compare queue loaded from/saved to localStorage
  const [compareQueue, setCompareQueue] = useState<any[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("compare_queue");
      if (saved) setCompareQueue(JSON.parse(saved));
    } catch {}
  }, []);

  const saveCompareQueue = (queue: any[]) => {
    setCompareQueue(queue);
    localStorage.setItem("compare_queue", JSON.stringify(queue));
  };

  // URL Query handling
  useEffect(() => {
    const q = searchParams.get("q");
    const tab = searchParams.get("tab");
    const patentId = searchParams.get("patentId");
    const mode = searchParams.get("mode");
    const concepts = searchParams.get("concepts");

    if (mode) setHandoffMode(mode);
    if (concepts) setHandoffConcepts(concepts);

    if (tab) {
      setActiveTab(tab);
    }
    if (q) {
      if (tab === "ai" || !tab) {
        setAiQuery(q);
        handleAiSearch(q);
      } else if (tab === "fielded") {
        setFieldedKeywords(q);
      } else if (tab === "boolean") {
        setBooleanQuery(q);
      }
    }
    if (patentId) {
      // Find patent if visible in current results or load mock
      const existing = searchResults?.results?.find((p: any) => p.id === patentId || p.patent_number === patentId) || 
                       savedPatents.find((p) => p.id === patentId);
      if (existing) {
        setSelectedPatent(existing);
      }
    }
  }, [searchParams]);

  // -------------------------------------------------------------
  // TAB 1: AI Search State & Execution
  // -------------------------------------------------------------
  const [aiQuery, setAiQuery] = useState("");
  const [searchBase, setSearchBase] = useState("Description and claims");
  const [globalLogic, setGlobalLogic] = useState("AND");
  const [restrictPublication, setRestrictPublication] = useState(false);
  const [runInBackground, setRunInBackground] = useState(false);
  const [resultsCount, setResultsCount] = useState(100);
  const [selectedModes, setSelectedModes] = useState<string[]>(["keyword", "semantic", "hybrid"]);
  const [includeSynonyms, setIncludeSynonyms] = useState(true);
  const [includeVectors, setIncludeVectors] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [countryFilter, setCountryFilter] = useState("US");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [technologyFilter, setTechnologyFilter] = useState("");
  const [familyQuery, setFamilyQuery] = useState("");
  const [citationQuery, setCitationQuery] = useState("");
  const [documentQuery, setDocumentQuery] = useState("");
  const [imageQuery, setImageQuery] = useState("");

  // Semantic Search State
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<any[]>([]);

  const handleSaveToProject = async () => {
    let queryToSave = queryRows.filter(r => r.value).map(r => `${r.logic ? r.logic + " " : ""}${r.field}: "${r.value}"`).join(" ");

    if (!queryToSave.trim() && !booleanQuery.trim() && !numbersQuery.trim()) {
      show("Please enter a query to save.", "error");
      return;
    }

    if (!saveQueryName.trim()) {
      show("Query name is required. Please add it in the right panel.", "error");
      return;
    }

    setIsSavingNotes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
      
      const structuredConfig = {
        queryRows,
        booleanQuery,
        numbersQuery,
        activeTab,
        options: buildAdvancedOptions()
      };
      
      let normalized_query = "";
      if (activeTab === 'fielded') normalized_query = queryRows.filter(r => r.value).map(r => `${r.logic ? r.logic + " " : ""}${r.field}: "${r.value}"`).join(" ");
      else if (activeTab === 'boolean') normalized_query = booleanQuery;
      else if (activeTab === 'numbers') normalized_query = numbersQuery;

      const res = await apiFetch("/api/searches/saved", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          name: saveQueryName,
          description: searchNotes,
          search_configuration: structuredConfig,
          normalized_query,
          project_id: selectedProject || undefined
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save structured query");
      }

      if (selectedProject || searchNotes) {
        const { error } = await supabase.from('search_notes').insert([
          { 
            note: searchNotes || "Saved query context", 
            project_id: selectedProject || null,
            research_type: researchType,
            created_at: new Date().toISOString() 
          }
        ]);
        if (error) console.error("Note save error", error);
      }

      show("Query and research saved successfully!", "success");
      setSaveQueryName("");
      setSearchNotes("");
      setSelectedProject("");
    } catch (err: any) {
      show(err.message || "Unknown error occurred while saving.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setLoading(true);
    setLoadingStep("Running vector similarity search...");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/ai/semantic-search`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ query: semanticQuery, limit: 20 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSemanticResults(data.results || []);
        show(`Semantic search found ${data.results?.length || 0} similar patents`, "success");
      } else {
        show("Semantic search failed. Is the backend running?", "error");
      }
    } catch {
      show("Connection error. Please check your backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  const [queryGroups, setQueryGroups] = useState<any[]>([
    {
      id: "g1",
      logic: "AND",
      fields: [
        { id: "f1", type: "Full Text", value1: "", value2: "" },
        { id: "f2", type: "Publication date", value1: "", value2: "" },
        { id: "f3", type: "Country code", value1: "", value2: "" },
        { id: "f4", type: "IPC", value1: "", value2: "" },
        { id: "f5", type: "Assignees / Applicants", value1: "All", value2: "" },
        { id: "f6", type: "Legal status is", value1: "", value2: "" },
        { id: "f7", type: "Line numbers", value1: "", value2: "" },
      ],
    },
  ]);

  const addGroup = () => {
    setQueryGroups([...queryGroups, { id: `g${Date.now()}`, logic: "AND", fields: [] }]);
  };

  const addField = (groupId: string, index: number) => {
    setQueryGroups(queryGroups.map(g => {
      if (g.id === groupId) {
        const newFields = [...g.fields];
        newFields.splice(index + 1, 0, { id: `f${Date.now()}`, type: "Full Text", value1: "", value2: "" });
        return { ...g, fields: newFields };
      }
      return g;
    }));
  };

  const removeField = (groupId: string, fieldId: string) => {
    setQueryGroups(queryGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, fields: g.fields.filter((f: any) => f.id !== fieldId) };
      }
      return g;
    }));
  };

  const updateField = (groupId: string, fieldId: string, key: string, value: string) => {
    setQueryGroups(queryGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          fields: g.fields.map((f: any) => f.id === fieldId ? { ...f, [key]: value } : f)
        };
      }
      return g;
    }));
  };

  const updateGroupLogic = (groupId: string, logic: string) => {
    setQueryGroups(queryGroups.map(g => g.id === groupId ? { ...g, logic } : g));
  };

  const handleAiSearch = async (overrideQuery?: string) => {
    setLoading(true);
    setLoadingStep("Understanding your request...");

    if (sandbox.enabled) {
      const qValue = overrideQuery || aiQuery;
      sandbox.search(qValue);
      const results = sandbox.results;
      const tagged = memory.tagResults(results);
      const summary = memory.getSummary(results);
      setSearchResults({
        results: tagged,
        total: results.length,
        page: 1,
        page_size: results.length,
        took_ms: 0,
        _memorySummary: summary,
        _sandbox: true,
      });
      show(`[SANDBOX] Found ${results.length} patents`, "success");
      setLoading(false);
      return;
    }

    // Collect all values to form a Google Patents query
    const terms: string[] = [];
    const qValue = overrideQuery !== undefined ? overrideQuery : aiQuery;
    if (qValue.trim()) terms.push(qValue.trim());
    
    queryGroups.forEach(g => {
      const groupTerms: string[] = [];
      g.fields.forEach((f: any) => {
        if (f.value1 || f.value2) {
          if (f.type === "Full Text" && f.value1) groupTerms.push(`"${f.value1}"`);
          else if (f.type === "Country code" && f.value1) groupTerms.push(`country:${f.value1}`);
          else if (f.type === "IPC" && f.value1) groupTerms.push(`ipc:${f.value1}`);
          else if (f.type === "Assignees / Applicants" && f.value2) groupTerms.push(`assignee:${f.value2}`);
        }
      });
      if (groupTerms.length > 0) {
        terms.push(`(${groupTerms.join(` ${g.logic} `)})`);
      }
    });

    const finalQuery = terms.join(` ${globalLogic} `) || "patent";

    setLoadingStep("Searching patent indexes...");

    try {
      const data = await searchPatents(finalQuery, "ai", buildAdvancedOptions({
        threshold: 80,
        mode: handoffMode,
        concepts: handoffConcepts,
      }));
      const mapped = {
        ...data,
        results: data.results.map((r: any) => ({
          ...r,
          id: r.patent_number,
        }))
      };
      const tagged = memory.tagResults(mapped.results);
      const summary = memory.getSummary(mapped.results);
      setSearchResults({
        ...mapped,
        results: tagged,
        _memorySummary: summary,
        _sandbox: false,
      });
      addRecentSearch({
        id: Date.now().toString(),
        query: finalQuery,
        filters: { query: finalQuery },
        result_count: mapped.results?.length || 0,
        created_at: new Date().toISOString()
      });
      show(`Found ${mapped.results?.length || 0} patents`, "success");
    } catch (e: any) {
      console.error(e);
      show(e.message || "Search failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: Fielded Search State & Execution
  // -------------------------------------------------------------
  const [fieldedKeywords, setFieldedKeywords] = useState("");
  const [fieldedInventor, setFieldedInventor] = useState("");
  const [fieldedAssignee, setFieldedAssignee] = useState("");
  const [fieldedPatNum, setFieldedPatNum] = useState("");
  const [fieldedAppNum, setFieldedAppNum] = useState("");
  const [fieldedPubNum, setFieldedPubNum] = useState("");
  const [fieldedAbstract, setFieldedAbstract] = useState("");
  const [fieldedClaims, setFieldedClaims] = useState("");
  const [fieldedIpc, setFieldedIpc] = useState("ALL");
  const [fieldedCpc, setFieldedCpc] = useState("");
  const [fieldedJurisdiction, setFieldedJurisdiction] = useState<string[]>(["US"]);
  const [fieldedSort, setFieldedSort] = useState("relevance");
  const [fieldedFilingDateFrom, setFieldedFilingDateFrom] = useState("");
  const [fieldedFilingDateTo, setFieldedFilingDateTo] = useState("");
  const [fieldedPubDateFrom, setFieldedPubDateFrom] = useState("");
  const [fieldedPubDateTo, setFieldedPubDateTo] = useState("");
  const [fieldedPriorityDateFrom, setFieldedPriorityDateFrom] = useState("");
  const [fieldedPriorityDateTo, setFieldedPriorityDateTo] = useState("");

  const handleFieldedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStep("Processing fielded filters...");

    const validRows = queryRows.filter(row => {
      if (row.field.includes('date')) {
        const parts = row.value ? row.value.split('|') : [];
        return parts[0]?.trim() || parts[1]?.trim();
      }
      return row.value && row.value.trim() !== '';
    });

    if (sandbox.enabled) {
      const filters: any = {};
      validRows.forEach(r => {
        if (r.field === 'Assignees / Applicants' || r.field === 'Company') filters.assignee = r.value;
        if (r.field === 'Inventors') filters.inventor = r.value;
        if (['Title', 'Abstract', 'Claims', 'Description', 'Title, Abstract, Claims (TAC)', 'Full Text'].includes(r.field)) {
           filters.query = (filters.query ? filters.query + " " : "") + r.value;
        }
      });
      sandbox.search("", filters);
      const results = sandbox.results;
      const tagged = memory.tagResults(results);
      const summary = memory.getSummary(results);
      setSearchResults({
        results: tagged,
        total: results.length,
        page: 1,
        page_size: results.length,
        took_ms: 0,
        _memorySummary: summary,
        _sandbox: true,
      });
      show(`[SANDBOX] Found ${results.length} patents`, "success");
      setLoading(false);
      return;
    }
    
    const constructedQuery = validRows
      .map((row, index) => {
        const logic = index > 0 ? `${row.logic} ` : '';
        if (row.field.includes('date')) {
          const parts = row.value ? row.value.split('|') : [];
          const start = parts[0]?.trim();
          const end = parts[1]?.trim();
          if (start && end) return `${logic}${row.field}: [${start} TO ${end}]`;
          if (start) return `${logic}${row.field}: >=${start}`;
          if (end) return `${logic}${row.field}: <=${end}`;
        }
        return `${logic}${row.field}: "${row.value.replace(/"/g, '')}"`;
      })
      .join(" ");

    try {
      const data = await searchPatents(constructedQuery || "general patent query", "fielded", buildAdvancedOptions({
        resultsCount: 10,
        searchModes: [...new Set([...selectedModes, "inventor", "assignee", "classification", "claim"])],
      }));
      const mapped = {
        ...data,
        results: data.results.map((r: any) => ({
          ...r,
          id: r.patent_number,
        }))
      };
      const tagged = memory.tagResults(mapped.results);
      const summary = memory.getSummary(mapped.results);
      setSearchResults({
        ...mapped,
        results: tagged,
        _memorySummary: summary,
        _sandbox: false,
      });
      addRecentSearch({
        id: Date.now().toString(),
        query: constructedQuery || "general patent query",
        filters: { query: constructedQuery || "general patent query" },
        result_count: mapped.results?.length || 0,
        created_at: new Date().toISOString()
      });
      show(`Found ${mapped.results?.length || 0} patents`, "success");
    } catch (e: any) {
      console.warn("Fielded search error:", e.message);
      show(e.message || "Search failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: Numbers Search State & Execution
  // -------------------------------------------------------------
  const [numbersQuery, setNumbersQuery] = useState("");
  const [includeFamily, setIncludeFamily] = useState(true);

  function toggleSearchMode(mode: string) {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) return prev.filter((m) => m !== mode);
      return [...prev, mode];
    });
  }

  function buildAdvancedOptions(extra: Record<string, any> = {}) {
    const modes = selectedModes.length ? selectedModes : ["keyword"];
    return {
      resultsCount,
      searchModes: modes,
      expandQuery: true,
      includeSynonyms,
      includeSemantic: modes.some((m) => ["semantic", "hybrid", "concept"].includes(m)),
      includeVectors,
      includeCitations,
      includeFamily,
      filters: {
        country: countryFilter,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
        inventor: fieldedInventor,
        assignee: fieldedAssignee,
        technology: technologyFilter,
        cpc_class: fieldedCpc,
        ipc_class: fieldedIpc === "ALL" ? "" : fieldedIpc,
        patent_family: familyQuery,
        citation: citationQuery,
        document_query: documentQuery,
        image_query: imageQuery,
      },
      ...extra,
    };
  }
  
  const handleNumbersSearch = async () => {
    if (!numbersQuery.trim()) return;
    setLoading(true);
    setLoadingStep("Looking up patent numbers...");

    if (sandbox.enabled) {
      sandbox.search(numbersQuery);
      const results = sandbox.results;
      const tagged = memory.tagResults(results);
      const summary = memory.getSummary(results);
      setSearchResults({
        results: tagged, total: results.length,
        page: 1, page_size: results.length, took_ms: 0,
        _memorySummary: summary, _sandbox: true,
      });
      show(`[SANDBOX] Found ${results.length} patents`, "success");
      setLoading(false);
      return;
    }

    try {
      const data = await searchPatents(numbersQuery, "numbers", buildAdvancedOptions({
        resultsCount: 10,
        searchModes: [...new Set([...selectedModes, "family"])],
      }));
      const mapped = {
        ...data,
        results: data.results.map((r: any) => ({
          ...r,
          id: r.patent_number,
        }))
      };
      const tagged = memory.tagResults(mapped.results);
      const summary = memory.getSummary(mapped.results);
      setSearchResults({ ...mapped, results: tagged, _memorySummary: summary, _sandbox: false });
      show(`Found ${mapped.results?.length || 0} patents`, "success");
    } catch (e: any) {
      console.error(e);
      show(e.message || "Search failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: Boolean Search State & Execution
  // -------------------------------------------------------------
  const [booleanQuery, setBooleanQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const booleanTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertOperator = (operator: string) => {
    const textarea = booleanTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const newText = text.substring(0, start) + operator + text.substring(end);
    setBooleanQuery(newText);
    
    // Put cursor back after the inserted operator
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + operator.length, start + operator.length);
    }, 50);
  };

  const handleBooleanSearch = async () => {
    if (!booleanQuery.trim()) return;
    setLoading(true);
    setLoadingStep("Parsing Boolean logic...");

    if (sandbox.enabled) {
      sandbox.search(booleanQuery);
      const results = sandbox.results;
      const tagged = memory.tagResults(results);
      const summary = memory.getSummary(results);
      setSearchResults({
        results: tagged, total: results.length,
        page: 1, page_size: results.length, took_ms: 0,
        _memorySummary: summary, _sandbox: true,
      });
      show(`[SANDBOX] Found ${results.length} patents`, "success");
      setLoading(false);
      return;
    }

    try {
      const data = await searchPatents(booleanQuery, "boolean", buildAdvancedOptions({
        resultsCount: 10,
        searchModes: [...new Set([...selectedModes, "boolean"])],
      }));
      const mapped = {
        ...data,
        results: data.results.map((r: any) => ({
          ...r,
          id: r.patent_number,
        }))
      };
      const tagged = memory.tagResults(mapped.results);
      const summary = memory.getSummary(mapped.results);
      setSearchResults({ ...mapped, results: tagged, _memorySummary: summary, _sandbox: false });
      show(`Found ${mapped.results?.length || 0} patents`, "success");
    } catch (e: any) {
      console.error(e);
      show(e.message || "Search failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Helpers: Save, Compare, Export
  // -------------------------------------------------------------
  const toggleSave = async (p: any) => {
    const isSaved = savedPatents.some((saved) => saved.id === p.id || saved.patentNumber === p.patent_number);
    if (isSaved) {
      const saved = savedPatents.find((s) => s.id === p.id || s.patentNumber === p.patent_number);
      if (saved) {
        await removePatent(saved.id);
        show("Patent removed from saved", "info");
      }
    } else {
      try {
        const ok = await savePatent(p);
        if (ok) show("Patent saved successfully", "success");
      } catch (err: any) {
        show("Failed to save patent: " + (err.message || "Unknown error"), "error");
      }
    }
  };

  const handleBulkSave = async () => {
    setLoading(true);
    setLoadingStep("Saving selected patents...");
    let savedCount = 0;
    for (const id of selectedPatents) {
      const p = searchResults.results.find((r: any) => r.id === id || r.patent_number === id);
      if (p) {
        const isSaved = savedPatents.some((saved) => saved.id === p.id || saved.patentNumber === p.patent_number);
        if (!isSaved) {
          try {
            await savePatent(p);
            savedCount++;
          } catch (e) {}
        }
      }
    }
    setLoading(false);
    setSelectedPatents([]);
    if (savedCount > 0) {
      show(`Saved ${savedCount} patents successfully`, "success");
    } else {
      show("No new patents were saved", "info");
    }
  };

  const toggleCompare = (p: any) => {
    const inQueue = compareQueue.some((q) => q.id === p.id);
    if (inQueue) {
      saveCompareQueue(compareQueue.filter((q) => q.id !== p.id));
    } else {
      if (compareQueue.length >= 3) {
        alert("You can compare up to 3 patents. Please remove one first.");
        return;
      }
      saveCompareQueue([...compareQueue, p]);
    }
  };

  const exportPatentJson = (p: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `patent_${p.patent_number}.json`);
    dlAnchorElem.click();
  };

  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});




  const handleRestoreRecentSearch = (searchItem: any) => {
    setQueryRows([{
      id: Math.random().toString(),
      logic: "",
      field: "Title, Abstract, Claims (TAC)",
      operator: "Contains",
      value: searchItem.query || ""
    }]);
    show("Restored recent search to query builder", "info");
  };

  const handleRunRecentSearch = async (searchItem: any) => {
    setLoading(true);
    setLoadingStep("Loading historical search results...");
    try {
      const res = await searchPatents(searchItem.query, searchItem.type || 'hybrid');
      setSearchResults(res);
      show("Loaded search results", "success");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      show(e.message || "Failed to load historical search", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patent Engine</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access the complete prior art database using AI-driven semantic match or traditional fielded parameters.
          </p>
        </div>
        <Button 
          onClick={() => { window.location.href = "/dashboard/ai-hub"; }}
          className="bg-gradient-to-r from-[#5746f3] to-[#a33df1] hover:from-[#4939d8] hover:to-[#892ccf] text-white font-bold shadow-md gap-2 h-10 border-0"
        >
          <Brain className="h-4 w-4" />
          MOAT AI HUB
        </Button>
      </div>



      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-4">
      {/* 1 Search Mode */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[#c9a84c]/20 text-[#c9a84c] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
            <h2 className="text-sm font-bold text-foreground">Search Mode</h2>
            <span className="text-xs text-muted-foreground ml-2">Choose the field(s) you want to search</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: 'novelty', label: 'Novelty search', icon: Search },
              { id: 'fto', label: 'FTO', icon: ShieldCheck },
              { id: 'validity', label: 'Validity and invalidity search', icon: FileText },
              { id: 'landscape', label: 'Landscape or White Space analysis', icon: Layers },
              { id: 'design', label: 'Design search', icon: LayoutGrid },
            ].map((mode) => {
              const active = selectedModes.includes(mode.id);
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleSearchMode(mode.id)}
                  className={`flex items-center gap-2 rounded-md border p-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#c9a84c] text-foreground bg-[#c9a84c]/5 shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#c9a84c]' : 'text-muted-foreground'}`} />
                  <span className="text-left leading-tight">{mode.label}</span>
                  {active && <Check className="w-3 h-3 text-[#c9a84c] ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2 Filters & Search Query Builder */}
      <Card className="border-border/70 bg-card shadow-sm mt-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#c9a84c]/20 text-[#c9a84c] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</div>
              <h2 className="text-sm font-bold text-foreground">Filters & Search Query Builder</h2>
              <span className="text-xs text-muted-foreground ml-2">Combine filters and logical search parameters</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-semibold text-muted-foreground">
                  <HelpCircle className="w-3.5 h-3.5" /> Use Query Helper <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setQueryRows([
                  { id: Math.random().toString(), logic: "", field: "Assignees / Applicants", operator: "Contains", value: "Google" },
                  { id: Math.random().toString(), logic: "AND", field: "Title, Abstract, Claims (TAC)", operator: "Contains", value: "machine learning" },
                ])}>
                  Prior Art Pattern
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQueryRows([
                  { id: Math.random().toString(), logic: "", field: "Legal status", operator: "Contains", value: "Active" },
                  { id: Math.random().toString(), logic: "AND", field: "Title, Abstract, Claims (TAC)", operator: "Contains", value: "battery cooling" },
                  { id: Math.random().toString(), logic: "AND", field: "Country code", operator: "Contains", value: "US" },
                ])}>
                  FTO Pattern
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQueryRows([
                  { id: Math.random().toString(), logic: "", field: "Title, Abstract, Claims (TAC)", operator: "Contains", value: "" },
                  { id: Math.random().toString(), logic: "NOT", field: "Assignees / Applicants", operator: "Contains", value: "" },
                ])}>
                  White Space Analysis Pattern
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          

          <div className="space-y-2">
            <div className="grid grid-cols-[30px_80px_1fr_3fr_80px] gap-3 text-[11px] font-semibold text-muted-foreground pb-1 px-2">
              <div></div>
              <div></div>
              <div>Field</div>
              <div>Value / Input</div>
              <div className="text-center">Actions</div>
            </div>
            
            {queryRows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-[30px_80px_1fr_3fr_80px] gap-3 items-center group">
                <label className="flex items-center justify-center w-6 h-6 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-input text-[#c9a84c] focus:ring-[#c9a84c] w-5 h-5 cursor-pointer accent-[#c9a84c]" />
                </label>
                <div>
                  {index > 0 && (
                    <select
                      value={row.logic}
                      onChange={(e) => updateQueryRow(row.id, 'logic', e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-xs font-bold text-foreground"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                      <option value="NOT">NOT</option>
                    </select>
                  )}
                </div>
                <div>
                  <select
                    value={row.field}
                    onChange={(e) => updateQueryRow(row.id, 'field', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs text-foreground font-medium"
                  >
                    {(
                      index === 0 ? ["Title", "Abstract", "Claims", "Description", "Title, Abstract, Claims (TAC)", "Full Text"] :
                      index === 1 ? ["Publication date", "Application date / Filing date", "Priority date"] :
                      index === 2 ? ["Country code"] :
                      index === 3 ? ["Application number", "Publication number"] :
                      index === 4 ? ["IPC (International Patent Classification)", "CPC (Cooperative Patent Classification)"] :
                      index === 5 ? ["Assignees / Applicants", "Inventors", "Company"] :
                      index === 6 ? ["Legal status"] :
                      index === 7 ? ["Cited (forward citations)", "Citing / Cites (backward citations)"] :
                      [
                        "Title", "Abstract", "Claims", "Description", "Title, Abstract, Claims (TAC)", "Full Text",
                        "Publication date", "Application date / Filing date", "Priority date",
                        "Country code", "Application number", "Publication number",
                        "IPC (International Patent Classification)", "CPC (Cooperative Patent Classification)",
                        "Assignees / Applicants", "Inventors", "Company",
                        "Legal status",
                        "Cited (forward citations)", "Citing / Cites (backward citations)"
                      ]
                    ).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  {row.field === 'Country code' ? (
                    <select
                      value={row.value}
                      onChange={(e) => updateQueryRow(row.id, 'value', e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs text-foreground font-medium"
                    >
                      <option value="">Select country...</option>
                      <option value="US">US (United States)</option>
                      <option value="EP">EP (European Patent Office)</option>
                      <option value="WO">WO (WIPO/PCT)</option>
                      <option value="CN">CN (China)</option>
                      <option value="JP">JP (Japan)</option>
                      <option value="KR">KR (South Korea)</option>
                      <option value="DE">DE (Germany)</option>
                      <option value="GB">GB (United Kingdom)</option>
                      <option value="FR">FR (France)</option>
                      <option value="CA">CA (Canada)</option>
                      <option value="AU">AU (Australia)</option>
                      <option value="IN">IN (India)</option>
                    </select>
                  ) : row.field === 'Legal status' ? (
                    <select
                      value={row.value}
                      onChange={(e) => updateQueryRow(row.id, 'value', e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-xs text-foreground font-medium"
                    >
                      <option value="">Select status...</option>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Expired">Expired</option>
                      <option value="Abandoned">Abandoned</option>
                    </select>
                  ) : row.field.includes('date') ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type="date"
                          value={row.value ? row.value.split('|')[0] || '' : ''}
                          onChange={(e) => updateQueryRow(row.id, 'value', `${e.target.value}|${row.value ? row.value.split('|')[1] || '' : ''}`)}
                          className="h-9 text-xs bg-transparent" 
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">to</span>
                      <div className="relative flex-1">
                        <Input 
                          type="date"
                          value={row.value ? row.value.split('|')[1] || '' : ''}
                          onChange={(e) => updateQueryRow(row.id, 'value', `${row.value ? row.value.split('|')[0] || '' : ''}|${e.target.value}`)}
                          className="h-9 text-xs bg-transparent" 
                        />
                      </div>
                    </div>
                  ) : (
                    <Input 
                      value={row.value}
                      onChange={(e) => updateQueryRow(row.id, 'value', e.target.value)}
                      placeholder={
                        row.field === 'Title' ? 'Enter title keywords' :
                        row.field === 'Abstract' ? 'Enter abstract keywords' :
                        row.field === 'Claims' ? 'Enter claims keywords' :
                        row.field === 'Description' ? 'Enter description keywords' :
                        (row.field === 'Title, Abstract, Claims (TAC)' || row.field === 'Full Text') ? 'Enter keywords' :
                        row.field === 'Application number' ? 'e.g., 15/123,456' :
                        row.field === 'Publication number' ? 'e.g., US2023012345' :
                        row.field === 'Assignees / Applicants' ? 'e.g., Google LLC' :
                        row.field === 'Inventors' ? 'e.g., John Doe' :
                        row.field === 'Company' ? 'e.g., Apple Inc.' :
                        row.field === 'Cited (forward citations)' || row.field === 'Citing / Cites (backward citations)' ? 'e.g., US1234567' :
                        row.field.includes('date') ? 'YYYY-MM-DD' :
                        'e.g., H02J7/00'
                      } 
                      className="h-9 text-xs bg-transparent" 
                    />
                  )}
                </div>
                <div className="flex justify-center gap-1.5 opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-[#c9a84c] border border-[#c9a84c]/20 hover:bg-[#c9a84c]/10" onClick={addQueryRow}><Plus className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 border border-red-100 hover:bg-red-50" onClick={() => removeQueryRow(row.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 pb-6">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Sort By</label>
              <select className="w-32 h-8 rounded-md border border-input bg-transparent px-2 text-xs">
                <option>Relevance</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" className="rounded border-input text-[#c9a84c] focus:ring-[#c9a84c]" />
              Include Family Members <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-input text-[#c9a84c] focus:ring-[#c9a84c] accent-[#c9a84c]" />
              Remove Duplicates <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" className="rounded border-input text-[#c9a84c] focus:ring-[#c9a84c]" />
              Translate Results <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
          </div>

          <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Button onClick={addQueryRow} variant="outline" size="sm" className="h-8 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs text-muted-foreground border-dashed"><Filter className="w-3 h-3 mr-1" /> Add Group</Button>
              <Button onClick={() => setQueryRows([{ id: "1", logic: "", field: "Title, Abstract, Claims (TAC)", operator: "Contains", value: "" }])} variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">Clear All</Button>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoSaveQuery} 
                  onChange={(e) => setAutoSaveQuery(e.target.checked)} 
                  className="rounded border-border" 
                />
                Auto-save
              </label>
              <Button onClick={handleSaveToProject} variant="outline" size="sm" className="h-8 text-xs text-[#c9a84c] border-[#c9a84c]/30 hover:bg-[#c9a84c]/10">
                <Bookmark className="w-3 h-3 mr-1" /> Save Query
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {/* reset */}}>Reset</Button>
              <Button onClick={handleFieldedSearch} size="sm" className="h-8 text-xs bg-[#c9a84c] hover:bg-[#b8943d] text-white">
                <Search className="w-3 h-3 mr-1" /> Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      </div>

      {/* Side Panels */}
      <div className="space-y-4">
        <Card className="border-border/70 shadow-sm bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {recentSearches && recentSearches.length > 0 ? (
                recentSearches.slice(0, 30).map((h, i) => (
                  <div key={h.id || i} className="flex flex-col">
                    <div 
                      onClick={() => setExpandedSearch(expandedSearch === h.id ? null : h.id)} 
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <p className={`text-xs font-medium ${expandedSearch === h.id ? '' : 'truncate'}`}>{h.query || "Empty search"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(h.timestamp || h.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] h-5">{h.results?.length || h.result_count || 0}</Badge>
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedSearch === h.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {expandedSearch === h.id && (
                      <div className="px-3 pb-3 pt-1 flex flex-col gap-2 bg-muted/10">
                        <div className="text-[10px] text-muted-foreground bg-background p-2 rounded border border-border/50 font-mono break-words">
                          {h.query}
                        </div>
                        <div className="flex gap-2 w-full mt-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-[10px] flex-1 text-muted-foreground border-border/60 hover:bg-muted" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreRecentSearch(h);
                            }}
                          >
                            <Search className="w-3 h-3 mr-1" /> Edit Query
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-[10px] flex-1 bg-[#c9a84c] hover:bg-[#b8943d] text-white shadow-sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunRecentSearch(h);
                            }}
                          >
                            <History className="w-3 h-3 mr-1" /> View Results
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">No recent searches</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileJson className="w-4 h-4 text-muted-foreground" />
              Save to Research Project
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-2">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full mt-2 border rounded-md bg-transparent p-2 text-xs font-semibold h-9"
              >
                <option value="">-- Select Target Project --</option>
                {researchProjects && researchProjects.map((proj: any) => (
                  <option key={proj.id} value={proj.id}>{proj.title}</option>
                ))}
              </select>

              <input 
                type="text" 
                value={saveQueryName} 
                onChange={(e) => setSaveQueryName(e.target.value)}
                className="w-full mt-2 border rounded-md bg-transparent p-2 text-xs font-semibold h-9 focus:border-[#c9a84c] outline-none"
                placeholder="Query Name (e.g. Battery Search)"
              />

              <select
                value={researchType}
                onChange={(e) => setResearchType(e.target.value)}
                className="w-full border rounded-md bg-transparent p-2 text-xs font-semibold h-9"
              >
                <option value="general">General Research</option>
                <option value="prior_art">Prior Art Search</option>
                <option value="fto">Freedom to Operate (FTO)</option>
                <option value="invalidity">Invalidity Search</option>
              </select>
            </div>

            <Textarea
              value={searchNotes}
              onChange={(e) => setSearchNotes(e.target.value)}
              placeholder="Add your notes or description here..."
              className="w-full min-h-[100px] resize-y bg-background"
            />
            <Button
              onClick={handleSaveToProject}
              disabled={isSavingNotes || !saveQueryName.trim()}
              className="w-full bg-[#c9a84c] hover:bg-[#b8943d] text-white h-9 text-xs font-bold mt-2"
            >
              {isSavingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookmarkCheck className="w-4 h-4 mr-2" />}
              Save Search to Project
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-9 text-xs font-bold mt-2 border-[#c9a84c]/50 text-[#c9a84c] hover:bg-[#c9a84c]/10"
            >
              <Link href="/dashboard/comparison">Compare Project Patents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Sandbox Mode Banner */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sandbox.toggle();
              setSearchResults(null);
              if (!sandbox.enabled) show("Sandbox mode activated — searching 23 sample patents", "info");
              else show("Live search mode activated", "info");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              sandbox.enabled
                ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            {sandbox.enabled ? "[SANDBOX MODE ON]" : "Sandbox Mode"}
          </button>
          {!activeScheme && (
            <span className="text-[10px] text-muted-foreground italic">
              No highlight scheme selected.{" "}
              <button
                onClick={() => router.push("/dashboard/highlights")}
                className="text-primary hover:underline"
              >
                Apply one from your Highlight Library?
              </button>
            </span>
          )}
        </div>
        <button
          onClick={() => {
            memory.resetMemory();
            show("Memory cleared", "info");
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Clear memory
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4 pt-6">
          <p className="text-sm font-semibold text-foreground text-center mb-4">{loadingStep}</p>
          <SearchResultsSkeleton count={6} />
        </div>
      )}

      {/* Empty State */}
      {!loading && searchResults && searchResults.results?.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No patents found"
          description="Try adjusting your search terms or use different keywords"
          action="Clear search"
          onAction={() => setSearchResults(null)}
        />
      )}

      {/* Search Results Display */}
      {!loading && searchResults && searchResults.results?.length > 0 && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between border-b pb-3">
            <div className="text-xs font-semibold text-muted-foreground">
              {searchResults._sandbox && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mr-1 align-middle">
                  [SANDBOX]
                </span>
              )}
              {searchResults.results?.length} results &middot; {searchResults.search_stats?.search_time_ms || 0}ms
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 ${viewMode === "list" ? "bg-muted" : ""}`}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`h-8 w-8 ${viewMode === "grid" ? "bg-muted" : ""}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Memory Summary */}
          {searchResults._memorySummary && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {searchResults._memorySummary.total} results —{" "}
                <span className="text-emerald-600 font-semibold">{searchResults._memorySummary.newCount} NEW</span>
                {", "}
                <span className="text-muted-foreground">{searchResults._memorySummary.seenCount} already seen</span>
              </p>
              {searchResults._memorySummary.seenCount > 0 &&
                searchResults._memorySummary.seenCount / searchResults._memorySummary.total > 0.7 && (
                  <p className="text-[10px] text-amber-600 italic">
                    Most results are patents you've already reviewed. Consider refining your search.
                  </p>
                )}
            </div>
          )}

          {/* Sandbox Export Prompt */}
          {searchResults._sandbox && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <span className="text-xs text-amber-800 dark:text-amber-300">
                Searching in Sandbox mode. Would you like to save this search to a new project?
              </span>
              <button
                onClick={() => {
                  sandbox.disable();
                  router.push("/dashboard/workspace");
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Save to project →
              </button>
            </div>
          )}

          {/* Check Alerts */}
          {!sandbox.enabled && (
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch("/api/check-alerts", { method: "POST" });
                    const data = await res.json();
                    if (data.notifications?.length > 0) {
                      data.notifications.forEach((n: any) => {
                        alertStore.addNotification(n);
                      });
                      show(`${data.notifications.length} alert(s) triggered`, "info");
                    } else {
                      show("No new alert matches found", "info");
                    }
                  } catch {
                    show("Failed to check alerts", "error");
                  }
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                🔔 Check Alerts
              </button>
            </div>
          )}

          {/* Search Intelligence Summary */}
          {(searchResults.search_modes?.length || searchResults.query_expansion?.expandedTerms?.length || searchResults.suggestions?.length) && (
            <Card className="border-border/70 bg-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground">Search Intelligence</h4>
                  {searchResults.search_stats?.ai_model && (
                    <span className="text-[10px] font-mono text-muted-foreground">{searchResults.search_stats.ai_model}</span>
                  )}
                </div>
                {searchResults.search_modes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Modes</span>
                    {searchResults.search_modes.map((mode: string) => (
                      <Badge key={mode} variant="outline" className="rounded-sm border-[#c9a84c]/30 bg-[#c9a84c]/10 text-[9px] text-[#8a6a1e] dark:text-[#f1d88a]">
                        {mode}
                      </Badge>
                    ))}
                  </div>
                )}
                {searchResults.query_expansion?.expandedTerms?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Expanded</span>
                    {searchResults.query_expansion.expandedTerms.slice(0, 12).map((term: string) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => { setAiQuery(term); setActiveTab("ai"); }}
                        className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Suggestions</span>
                    {searchResults.suggestions.slice(0, 8).map((suggestion: string) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => { setAiQuery(suggestion); handleAiSearch(suggestion); }}
                        className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-500/15 dark:text-blue-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Interpretation Box (only for AI searches) */}
          {activeTab === "ai" && searchResults.query_interpretation && (
            <Card className="bg-[#c9a84c]/5 border-[#c9a84c]/10">
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-[#c9a84c]">Query interpreted as:</h4>
                  <p className="text-xs text-foreground mt-0.5 italic">{searchResults.query_interpretation}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-muted-foreground">Key Concepts:</span>
                  {searchResults.key_concepts?.map((c: string) => (
                    <Badge key={c} variant="outline" className="text-[9px] font-normal px-2 py-0 border-[#c9a84c]/20 text-[#c9a84c]">
                      {c}
                    </Badge>
                  ))}
                </div>
                {searchResults.suggested_ipc_codes && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-muted-foreground">Suggested IPCs:</span>
                    {searchResults.suggested_ipc_codes.map((ipc: string) => (
                      <button
                        key={ipc}
                        onClick={() => {
                          setFieldedIpc(ipc[0]);
                          setFieldedCpc(ipc);
                          setActiveTab("fielded");
                        }}
                        className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 text-[#c9a84c]"
                      >
                        {ipc}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results List / Grid */}
          {selectedPatents.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button 
                onClick={handleBulkSave} 
                className="bg-[#c9a84c] text-black hover:bg-[#b09342] h-8 text-xs font-bold"
              >
                Save Selected Patents ({selectedPatents.length})
              </Button>
            </div>
          )}
          <div className={viewMode === "list" ? "space-y-4" : "grid gap-4 sm:grid-cols-2 md:grid-cols-3"}>
            {searchResults.results?.map((patent: any, index: number) => {
              const isSaved = savedPatents.some((saved) => saved.id === patent.id || saved.patentNumber === patent.patent_number);
              const inCompare = compareQueue.some((q) => q.id === patent.id);
              const hybridScore = Math.round(patent.hybrid_score ?? patent.ai_match_score ?? 80);
              const semanticScore = Math.round(patent.semantic_score ?? hybridScore);
              const relevanceScore = Math.round(patent.relevance_score ?? hybridScore);
              const noveltyScore = Math.round(patent.novelty_score ?? 50);
              const citationScore = Math.round(patent.citation_score ?? 0);
              const score = hybridScore;
              const barColor = score > 85 ? "bg-emerald-500" : score > 70 ? "bg-amber-500" : "bg-gray-400";
              const isExpanded = expandedAbstracts[patent.id] || false;

              return (
                <div
                  key={patent.id || patent.patent_number || patent.patentNumber || index}
                  className="group relative flex flex-col justify-between rounded-lg border border-border/60 bg-card overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  {/* Match Relevance Bar */}
                  <div className="w-full h-1 bg-muted">
                    <div className={`h-full ${barColor}`} style={{ width: `${score}%` }} />
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 mr-1 rounded border-input text-[#c9a84c] focus:ring-[#c9a84c]"
                            checked={selectedPatents.includes(patent.id || patent.patent_number || index.toString())}
                            onChange={(e) => {
                              const pid = patent.id || patent.patent_number || index.toString();
                              if (e.target.checked) {
                                setSelectedPatents([...selectedPatents, pid]);
                              } else {
                                setSelectedPatents(selectedPatents.filter(id => id !== pid));
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              memory.markSeen(patent.id);
                              setSelectedPatent(patent);
                            }}
                            className="font-semibold text-primary hover:underline"
                          >
                            {patent.patent_number}
                          </button>
                          {patent.status === "NEW" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              [NEW]
                            </span>
                          )}
                          {patent.status === "SEEN" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-muted text-muted-foreground">
                              [SEEN]
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-semibold">Hybrid: {score}%</span>
                          <button
                            onClick={() => toggleSave(patent)}
                            className="text-muted-foreground hover:text-emerald-500 transition-colors"
                            title={isSaved ? "Saved" : "Save Patent"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 
                        onClick={() => setSelectedPatent(patent)}
                        className="mt-2 text-sm font-bold text-foreground leading-snug cursor-pointer hover:text-primary transition-colors"
                        title="View full patent details"
                      >
                        {patent.title}
                      </h3>

                      {/* Metadata */}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {patent.assignee} &middot; Filed {patent.filing_date} &middot; {patent.citations} citations
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          ["Semantic", semanticScore, "text-sky-700 border-sky-500/20 bg-sky-500/10 dark:text-sky-300"],
                          ["Relevance", relevanceScore, "text-emerald-700 border-emerald-500/20 bg-emerald-500/10 dark:text-emerald-300"],
                          ["Novelty", noveltyScore, "text-violet-700 border-violet-500/20 bg-violet-500/10 dark:text-violet-300"],
                          ["Citation", citationScore, "text-amber-700 border-amber-500/20 bg-amber-500/10 dark:text-amber-300"],
                        ].map(([label, value, classes]: any) => (
                          <span key={label} className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${classes}`}>
                            {label}: {value}%
                          </span>
                        ))}
                        {(patent.matched_modes || []).slice(0, 4).map((mode: string) => (
                          <span key={mode} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                            {mode}
                          </span>
                        ))}
                      </div>

                      {/* Abstract */}
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isExpanded || !patent.abstract || patent.abstract.length <= 160
                            ? patent.abstract || "No abstract available."
                            : `${patent.abstract.substring(0, 160)}...`}
                          
                          {patent.abstract && patent.abstract.length > 160 && (
                            <button
                              onClick={() => setExpandedAbstracts((prev) => ({ ...prev, [patent.id]: !isExpanded }))}
                              className="ml-1 text-primary hover:underline font-semibold"
                            >
                              {isExpanded ? "Read less" : "Read more"}
                            </button>
                          )}
                        </p>
                        <button
                          onClick={() => setSelectedPatent(patent)}
                          className="text-xs font-semibold text-blue-500 hover:text-blue-600 hover:underline mt-1.5 inline-block"
                        >
                          View Full Patent &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {(patent.ipc_codes || patent.ipc || []).slice(0, 2).map((ipcCode: string) => (
                          <Badge key={ipcCode} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                            {ipcCode}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => exportPatentJson(patent)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Export JSON"
                        >
                          <FileJson className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleCompare(patent)}
                          className={`h-8 w-8 ${inCompare ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-foreground"}`}
                          title="Add to Compare Queue"
                        >
                          <GitCompare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Compare Queue Indicator */}
      {compareQueue.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-popover border shadow-lg rounded-full px-5 py-2.5 flex items-center gap-4">
          <span className="text-xs font-semibold">
            Comparing <span className="text-primary font-bold">{compareQueue.length}</span> / 3 patents
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowComparisonDialog(true)}
              className="h-8 text-xs font-bold"
            >
              Compare Now &rarr;
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => saveCompareQueue([])}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Clear Queue"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Patent Detail Dialog */}
      <Dialog open={!!selectedPatent} onOpenChange={(open) => {
        if (!open) setSelectedPatent(null);
      }}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">{selectedPatent?.title || "Patent Details"}</DialogTitle>
          <DialogDescription className="sr-only">View full details for this patent record.</DialogDescription>
          {selectedPatent && (
            <PatentDetailPanel
              patent={selectedPatent}
              onClose={() => {
                memory.markSeen(selectedPatent.id);
                setSelectedPatent(null);
              }}
              highlightScheme={activeScheme}
              highlightText={highlight.applyHighlight}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Comparison Modal */}
      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto p-6 bg-background">
          <DialogTitle className="sr-only">Compare Patents</DialogTitle>
          <DialogDescription className="sr-only">Compare selected patents side by side.</DialogDescription>
          <div className="relative">
            <ComparisonPage />
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-[#c9a84c]" /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
