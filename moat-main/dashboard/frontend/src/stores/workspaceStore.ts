import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceContext = "PATENT" | "TRADEMARK" | "COPYRIGHT" | null;

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
export type WorkspaceProjectStatus = string;

// Loosely typed on purpose: this is a stub (see note below), not the real
// feature, so the shape is left permissive rather than reverse-engineered
// field-by-field from the two page files that consume it.
export type Workspace = Record<string, any>;
export type WorkspaceProject = Record<string, any>;
export type WorkspaceMember = Record<string, any>;

interface WorkspaceState {
  // Existing, in-use elsewhere (Sidebar route-derived product-line context) —
  // do not change shape.
  workspace: WorkspaceContext;
  setWorkspace: (ws: WorkspaceContext) => void;

  // Team-workspace management (src/app/workspace, src/app/dashboard/workspace):
  // the UI for this was fully built, but there was never a backing API for it
  // (no /api/workspaces routes exist) — every action here previously called an
  // undefined function and crashed both pages immediately on load. This is a
  // stub that keeps the pages from throwing; it surfaces `error` instead of
  // silently pretending to succeed. Building the real feature (schema, RLS,
  // API routes) is a separate, larger piece of work.
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (...args: any[]) => Promise<void>;
  updateWorkspace: (...args: any[]) => Promise<void>;
  deleteWorkspace: (...args: any[]) => Promise<void>;
  createProject: (...args: any[]) => Promise<void>;
  updateProject: (...args: any[]) => Promise<void>;
  deleteProject: (...args: any[]) => Promise<void>;
  addMember: (...args: any[]) => Promise<void>;
  updateMember: (...args: any[]) => Promise<void>;
  removeMember: (...args: any[]) => Promise<void>;
}

const NOT_AVAILABLE = "Team workspace management isn't available yet.";

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspace: null,
      setWorkspace: (workspace) => set({ workspace }),

      workspaces: [],
      activeWorkspace: null,
      isLoading: false,
      isDetailLoading: false,
      error: null,

      fetchWorkspaces: async () => {
        set({ error: NOT_AVAILABLE, isLoading: false });
      },
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      createWorkspace: async () => { set({ error: NOT_AVAILABLE }); },
      updateWorkspace: async () => { set({ error: NOT_AVAILABLE }); },
      deleteWorkspace: async () => { set({ error: NOT_AVAILABLE }); },
      createProject: async () => { set({ error: NOT_AVAILABLE }); },
      updateProject: async () => { set({ error: NOT_AVAILABLE }); },
      deleteProject: async () => { set({ error: NOT_AVAILABLE }); },
      addMember: async () => { set({ error: NOT_AVAILABLE }); },
      updateMember: async () => { set({ error: NOT_AVAILABLE }); },
      removeMember: async () => { set({ error: NOT_AVAILABLE }); },
    }),
    { name: "moat-workspace", partialize: (state) => ({ workspace: state.workspace }) }
  )
);
