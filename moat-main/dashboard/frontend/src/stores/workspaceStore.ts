import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceContext = "PATENT" | "TRADEMARK" | "COPYRIGHT" | null;

interface WorkspaceState {
  workspace: WorkspaceContext;
  setWorkspace: (ws: WorkspaceContext) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspace: null,
      setWorkspace: (workspace) => set({ workspace }),
    }),
    { name: "moat-workspace" }
  )
);
