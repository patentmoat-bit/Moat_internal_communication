"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "./supabase/client";
import { apiFetch } from "@/lib/apiFetch";

export interface ActivityItem {
  id: string;
  type: "search" | "save" | "collect" | "report";
  description: string;
  timestamp: string;
}

export interface RecentSearch {
  id: string;
  query: string;
  type: "AI" | "Fielded" | "Numbers" | "Boolean";
  results: any[];
  timestamp: string;
}

export interface Patent {
  id: string;
  patentNumber: string;
  title: string;
  assignee: string;
  date: string;
  abstract: string;
  ipc: string[];
  saved: boolean;
  inventors?: string[];
  publication_date?: string;
  grant_date?: string;
  status?: string;
  cpc_codes?: string[];
  jurisdiction?: string;
  citations?: number;
  ai_match_score?: number;
  relevance_reason?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color?: string;
  patents: Patent[];
  created: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  searches: RecentSearch[];
  patents: Patent[];
  notes?: string;
  created: string;
}

export interface Alert {
  id: string;
  name: string;
  type: string;
  keywords: string[];
  ipcCodes: string[];
  assignees: string[];
  jurisdictions: string[];
  frequency: "Daily" | "Weekly" | "Monthly";
  notification: "In-app" | "Email";
  active: boolean;
  lastCheck: string;
  matchesCount: number;
}

export interface AppState {
  user: any;
  stats: {
    totalSearches: number;
    savedPatents: number;
    collections: number;
  };
  recentActivity: ActivityItem[];
  recentSearches: RecentSearch[];
  researchProjects: any[];
  savedPatents: Patent[];
  collections: Collection[];
  workspaces: Workspace[];
  alerts: Alert[];
  highlights: {
    colors: string[];
  };
  loading: boolean;
}

interface AppContextType {
  user: any;
  stats: { totalSearches: number; savedPatents: number; collections: number };
  savedPatents: Patent[];
  collections: Collection[];
  recentSearches: RecentSearch[];
  researchProjects: any[];
  recentActivity: ActivityItem[];
  workspaces: Workspace[];
  alerts: Alert[];
  highlights: { colors: string[] };
  loading: boolean;
  supabase: ReturnType<typeof createClient>;
  
  loadAllData: () => Promise<void>;
  addActivity: (type: ActivityItem["type"], description: string) => void;
  searchPatents: (query: string | object, searchType?: string, options?: any) => Promise<any>;
  savePatent: (patent: Omit<Patent, "saved"> | any) => Promise<boolean>;
  removePatent: (patentId: string) => Promise<void>;
  isPatentSaved: (patentNumber: string) => boolean;
  
  createCollection: (name: string, description: string, color?: string) => Promise<Collection>;
  deleteCollection: (collectionId: string) => Promise<void>;
  addToCollection: (collectionId: string, patentId: string | Patent) => Promise<boolean>;
  removeFromCollection: (collectionId: string, patentId: string) => Promise<void>;
  
  createWorkspace: (name: string, description: string) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  addWorkspaceSearch: (workspaceId: string, search: RecentSearch) => void;
  addWorkspacePatent: (workspaceId: string, patent: Patent) => void;
  updateWorkspaceNotes: (workspaceId: string, notes: string) => Promise<void>;
  
  createAlert: (alert: Omit<Alert, "id" | "active" | "lastCheck" | "matchesCount">) => Promise<void>;
  toggleAlert: (alertId: string) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  checkAlertSim: (alertId: string, matchesCount: number) => Promise<void>;
}

const defaultHighlights = [
  "#e9d54a", "#5fb8f0", "#7ed56a", "#c97de8", "#e88c3a", "#c95a3a",
  "#5a7ae8", "#e8c43a", "#e86a7a", "#7a8fb8", "#8ab878", "#7a8070"
];

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ totalSearches: 0, savedPatents: 0, collections: 0 });
  const [savedPatents, setSavedPatents] = useState<Patent[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [researchProjects, setResearchProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to map DB patents
  const mapDbPatent = (p: any): Patent => ({
    id: p.id,
    patentNumber: p.patent_number,
    title: p.title || "Untitled Patent",
    assignee: p.assignee || "Unknown Assignee",
    date: p.publication_date || p.filing_date || "",
    abstract: p.abstract || "",
    ipc: p.ipc_codes || [],
    saved: true,
    inventors: p.inventors || [],
    publication_date: p.publication_date,
    grant_date: p.raw_data?.grant_date || "",
    status: p.status || "Active",
    cpc_codes: p.cpc_codes || [],
    jurisdiction: p.jurisdiction || "US",
    citations: p.citations || 0,
    ai_match_score: p.ai_match_score || 0,
    relevance_reason: p.raw_data?.relevance_reason || ""
  });

  const loadStats = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await apiFetch('/api/stats', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (res.ok) setStats(await res.json());
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [p, c, s, w, a, ri] = await Promise.all([
        supabase.from('saved_patents').select('id, patent_number, title, assignee, publication_date, filing_date, abstract, ipc_codes, status, jurisdiction, citations').order('created_at', { ascending: false }),
        supabase.from('collections').select('id, name, description, color, created_at').order('created_at', { ascending: false }),
        supabase.from('recent_searches').select('id, query, search_type, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('workspaces').select('id, name, description, notes, created_at').order('created_at', { ascending: false }),
        supabase.from('alerts').select('id, name, alert_type, criteria, frequency, is_active, last_checked_at').order('created_at', { ascending: false }),
        supabase.from('moat_ideas').select('id, title, description, created_at').order('created_at', { ascending: false })
      ]);
      
      const mappedPatents = (p.data || []).map(mapDbPatent);
      setSavedPatents(mappedPatents);

      if (c.data) {
        const { data: collectionPatents } = await supabase.from("collection_patents").select("collection_id, patent_id");
        const mappedCols = c.data.map(col => {
          const patentIds = (collectionPatents || []).filter(cp => cp.collection_id === col.id).map(cp => cp.patent_id);
          const colPatents = mappedPatents.filter(pat => patentIds.includes(pat.id));
          return { id: col.id, name: col.name, description: col.description || "", color: col.color || defaultHighlights[0], patents: colPatents, created: col.created_at };
        });
        setCollections(mappedCols);
      }

      if (s.data) {
        setRecentSearches(s.data.map(rs => ({
          id: rs.id, query: rs.query, type: rs.search_type as any, results: rs.results || [], timestamp: rs.created_at
        })));
      }

      if (w.data) {
        const mappedWs = w.data.map(ws => ({
          id: ws.id, name: ws.name, description: ws.description || "", searches: [], patents: [], notes: ws.notes || "", created: ws.created_at
        }));
        setWorkspaces(mappedWs);
      }

      if (a.data) {
        setAlerts(a.data.map(al => ({
          id: al.id, name: al.name, type: al.alert_type, keywords: al.criteria?.keywords || [], ipcCodes: al.criteria?.ipcCodes || [], assignees: al.criteria?.assignees || [], jurisdictions: al.criteria?.jurisdictions || [], frequency: al.frequency || "Daily", notification: al.criteria?.notification || "In-app", active: al.is_active, lastCheck: al.last_checked_at, matchesCount: al.criteria?.matchesCount || 0
        })));
      }

      if (ri.data) {
        setResearchProjects(ri.data);
      }

      await loadStats();
    } finally {
      setLoading(false);
    }
  }, [supabase, loadStats]);

  useEffect(() => {
    // Check if we are running in real Supabase mode
    const isRealSupabaseVal = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id") &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon-key")
    );

    if (!isRealSupabaseVal) {
      // Offline/Mock mode
      const stored = localStorage.getItem("user_data");
      if (stored) {
        try {
          const mockUser = JSON.parse(stored);
          setUser(mockUser);
        } catch {
          setUser({ id: 'mock-user-id', name: 'Local Developer', email: 'developer@patentai.local', role: 'analyst' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              const u = session.user;
              localStorage.setItem("access_token", session.access_token);
              localStorage.setItem("refresh_token", session.refresh_token);
              localStorage.setItem("user_data", JSON.stringify({
                id: u.id,
                name: u.user_metadata?.name || u.email?.split("@")[0] || "User",
                email: u.email,
                role: u.user_metadata?.role || "analyst",
                createdAt: u.created_at
              }));
            }
          });
        }
        loadAllData();
      }
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token);
        localStorage.setItem("user_data", JSON.stringify({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
          email: session.user.email,
          role: session.user.user_metadata?.role || "analyst",
          createdAt: session.user.created_at
        }));
        loadAllData();
      }
      else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
        setSavedPatents([]);
        setCollections([]);
        setRecentSearches([]);
        setWorkspaces([]);
        setAlerts([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, loadAllData]);

  const addActivity = useCallback((type: ActivityItem["type"], description: string) => {
    setRecentActivity(prev => [{
      id: crypto.randomUUID(), type, description,
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 50));
  }, []);

  const searchPatents = useCallback(async (query: string | object, searchType = 'ai', options: any = {}) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await apiFetch('/api/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      // mode + concepts come from the Decision console hand-off and bias results.
      body: JSON.stringify({ query, searchType, options, mode: options?.mode, concepts: options?.concepts })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || err.error || 'Search failed');
    }
    const data = await res.json();
    await loadStats();
    
    setRecentSearches(prev => [{
      id: crypto.randomUUID(),
      query: typeof query === 'string' ? query : JSON.stringify(query),
      type: searchType as any,
      results: data.results || [],
      timestamp: new Date().toISOString()
    }, ...prev].slice(0, 20));
    
    // Auto-save search to database
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeToken = session?.access_token || token;
      apiFetch('/api/searches/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
        },
        body: JSON.stringify({
          query: typeof query === 'string' ? query : JSON.stringify(query),
          search_type: searchType,
          filters: options.filters || {}
        })
      }).catch(e => console.error("Auto-save search failed", e));
    });
    
    addActivity('search', `Searched: ${String(typeof query === 'string' ? query : JSON.stringify(query)).substring(0, 60)}`);
    return data;
  }, [loadStats, addActivity]);

  const savePatent = useCallback(async (patent: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
    const res = await apiFetch('/api/patents/save', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ patent })
    });
    if (!res.ok) {
      const text = await res.text();
      let err;
      try { err = JSON.parse(text); } catch { err = text; }
      throw new Error(typeof err === 'object' ? err.message || err.error || JSON.stringify(err) : err);
    }
    const json = await res.json();
    const saved = json.data || json;
    const mapped = mapDbPatent(saved);
    setSavedPatents(prev => prev.find(p => p.patentNumber === mapped.patentNumber) ? prev : [mapped, ...prev]);
    await loadStats();
    addActivity('save', `Saved: ${patent.title?.substring(0, 50)}`);
    return true;
  }, [loadStats, addActivity]);

  const removePatent = useCallback(async (patentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);
    const res = await apiFetch('/api/patents/save', {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ patent_number: patentId })
    });
    if (res.ok) {
      setSavedPatents(prev => prev.filter(p => p.id !== patentId));
      await loadStats();
      addActivity('save', `Removed saved patent`);
    }
  }, [loadStats, addActivity]);

  const createCollection = useCallback(async (name: string, description: string, color = '#7c3aed') => {
    try {
      const { fetchApi } = await import('@/lib/apiClient');
      const response = await fetchApi<any>('/collections', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      const newCol: Collection = {
        id: response.id,
        name: response.name,
        description: response.description,
        color: color || '#c9a84c',
        patents: [],
        created: response.created_at,
      };
      setCollections(prev => [...prev, newCol]);
      await loadStats();
      addActivity('collect', `Created collection: ${name}`);
      return newCol;
    } catch (error) {
      console.error("Error creating collection:", error);
      // Fallback for demo
      const newCol: Collection = {
        id: "col_" + Date.now().toString(),
        name,
        description,
        color: color || '#c9a84c',
        patents: [],
        created: new Date().toISOString(),
      };
      setCollections(prev => [...prev, newCol]);
      await loadStats();
      addActivity('collect', `Created collection: ${name}`);
      return newCol;
    }
  }, [loadStats, addActivity]);

  const addToCollection = useCallback(async (collectionId: string, patentOrId: string | Patent) => {
    let patentId = typeof patentOrId === "string" ? patentOrId : patentOrId.id;
    if (typeof patentOrId !== "string" && !patentOrId.id) {
       // if we need to save the patent first, but let's assume it's saved for simplicity.
       // in full implementation we'd save it first.
    }
    const { error } = await supabase.from('collection_patents')
      .insert({ collection_id: collectionId, patent_id: patentId });
    if (!error) {
       setCollections(prev => prev.map(c => {
         if (c.id === collectionId) {
            const patent = savedPatents.find(p => p.id === patentId);
            return patent ? { ...c, patents: [...c.patents, patent] } : c;
         }
         return c;
       }));
       addActivity('collect', 'Added patent to collection');
       return true;
    }
    return false;
  }, [supabase, addActivity, savedPatents]);

  const removeFromCollection = useCallback(async (collectionId: string, patentId: string) => {
    const { error } = await supabase.from('collection_patents')
      .delete().eq("collection_id", collectionId).eq("patent_id", patentId);
    if (!error) {
      setCollections(prev => prev.map(c => {
         if (c.id === collectionId) return { ...c, patents: c.patents.filter(p => p.id !== patentId) };
         return c;
      }));
    }
  }, [supabase]);

  const deleteCollection = useCallback(async (collectionId: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', collectionId);
    if (!error) {
      setCollections(prev => prev.filter(c => c.id !== collectionId));
      await loadStats();
    }
  }, [supabase, loadStats]);

  const createWorkspace = useCallback(async (name: string, description: string) => {
    const { data, error } = await supabase.from('workspaces')
      .insert({ user_id: user?.id, name, description })
      .select().single();
    if (!error && data) {
       const newWs: Workspace = { id: data.id, name: data.name, description: data.description || "", searches: [], patents: [], notes: "", created: data.created_at };
       setWorkspaces(prev => [newWs, ...prev]);
       return newWs;
    }
    throw new Error(error?.message || "Failed to create workspace");
  }, [supabase, user]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
    if (!error) setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
  }, [supabase]);

  const addWorkspaceSearch = useCallback((workspaceId: string, search: RecentSearch) => {}, []);
  const addWorkspacePatent = useCallback((workspaceId: string, patent: Patent) => {}, []);
  
  const updateWorkspaceNotes = useCallback(async (workspaceId: string, notes: string) => {
    const { error } = await supabase.from('workspaces').update({ notes }).eq('id', workspaceId);
    if (!error) setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, notes } : w));
  }, [supabase]);

  const createAlert = useCallback(async (alert: Omit<Alert, "id" | "active" | "lastCheck" | "matchesCount">) => {
    const { data, error } = await supabase.from("alerts").insert({
      user_id: user?.id, name: alert.name, alert_type: alert.type,
      criteria: { keywords: alert.keywords, ipcCodes: alert.ipcCodes, assignees: alert.assignees, jurisdictions: alert.jurisdictions, notification: alert.notification },
      frequency: alert.frequency, is_active: true
    }).select().single();
    if (!error && data) {
      setAlerts(prev => [{
        id: data.id, name: data.name, type: data.alert_type, keywords: data.criteria?.keywords || [], ipcCodes: data.criteria?.ipcCodes || [], assignees: data.criteria?.assignees || [], jurisdictions: data.criteria?.jurisdictions || [], frequency: data.frequency || "Daily", notification: data.criteria?.notification || "In-app", active: data.is_active, lastCheck: data.last_checked_at, matchesCount: data.criteria?.matchesCount || 0
      }, ...prev]);
    }
  }, [supabase, user]);

  const toggleAlert = useCallback(async (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;
    const { error } = await supabase.from("alerts").update({ is_active: !alert.active }).eq("id", alertId);
    if (!error) setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, active: !a.active } : a));
  }, [supabase, alerts]);

  const deleteAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase.from("alerts").delete().eq("id", alertId);
    if (!error) setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, [supabase]);

  const checkAlertSim = useCallback(async (alertId: string, matchesCount: number) => {}, []);

  const isPatentSaved = useCallback((patentNumber: string) =>
    savedPatents.some(p => p.patentNumber === patentNumber),
  [savedPatents]);

  const highlights = { colors: defaultHighlights };

  return (
    <AppContext.Provider value={{
      user, stats, savedPatents, collections, recentSearches, researchProjects,
      recentActivity, workspaces, alerts, highlights, loading,
      searchPatents, savePatent, removePatent,
      createCollection, deleteCollection, addToCollection, removeFromCollection,
      createWorkspace, deleteWorkspace, addWorkspaceSearch, addWorkspacePatent, updateWorkspaceNotes,
      createAlert, toggleAlert, deleteAlert, checkAlertSim,
      addActivity, loadAllData, isPatentSaved, supabase
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};
