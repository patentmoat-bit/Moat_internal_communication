import { create } from "zustand";
import { matterService } from "@/services/matterService";
import type { Matter, MatterCreateInput, MatterDocument, MatterDocumentType, MatterMember, MatterMemberRole, MatterStatus, MatterUpdateInput } from "@/types/matter";

interface MatterState {
  matters: Matter[];
  activeMatter: Matter | null;
  isLoading: boolean;
  error: string | null;
  fetchMatters: () => Promise<Matter[]>;
  fetchMatter: (id: string) => Promise<Matter>;
  setActiveMatter: (matter: Matter | null) => void;
  createMatter: (data: MatterCreateInput) => Promise<Matter>;
  updateMatter: (id: string, data: MatterUpdateInput) => Promise<Matter>;
  deleteMatter: (id: string) => Promise<void>;
  assignMember: (matterId: string, data: { email?: string; user_id?: string; role: MatterMemberRole }) => Promise<MatterMember>;
  shareMatter: (matterId: string, data: { email?: string; user_id?: string; role: MatterMemberRole; message?: string }) => Promise<MatterMember>;
  updateStatus: (matterId: string, status: MatterStatus, note?: string) => Promise<Matter>;
  updateNotes: (matterId: string, notes: string) => Promise<Matter>;
  addDocument: (matterId: string, data: { filename: string; document_type: MatterDocumentType; content_type?: string; size_bytes?: number; storage_url?: string; description?: string }) => Promise<MatterDocument>;
  deleteDocument: (matterId: string, documentId: string) => Promise<void>;
}

function now() {
  return new Date().toISOString();
}

function unavailable(error: unknown) {
  return error instanceof Error && ["Failed to fetch", "Unauthorized", "User not found", "404", "An error occurred"].some((text) => error.message.includes(text));
}

function activity(matterId: string, message: string, action: string, entity_type = "matter", entity_id?: string) {
  return {
    id: `local-activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    matter_id: matterId,
    actor_id: "demo-user",
    actor_name: "Demo User",
    action,
    entity_type,
    entity_id,
    message,
    details: null,
    created_at: now(),
  };
}

function demoMatters(): Matter[] {
  const stamp = now();
  const m1: Matter = {
    id: "matter-demo-1",
    workspace_id: "demo-workspace-1",
    owner_id: "demo-user",
    owner_name: "Demo User",
    matter_number: "MAT-00001",
    title: "Wearable Sensor Freedom-to-Operate",
    description: "Evaluate optical biometric sensing claims against launch hardware and planned firmware features.",
    client_name: "Aster Labs",
    technology_area: "Wearable health sensors",
    notes: "Counsel wants clear separation between signal acquisition, adaptive sampling, and cloud analytics claim elements.",
    status: "analysis",
    priority: "critical",
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString(),
    tags: ["FTO", "wearables", "optical sensing"],
    created_at: stamp,
    updated_at: stamp,
    role: "owner",
    member_count: 4,
    document_count: 3,
    activity_count: 5,
    members: [
      { id: "mm-1", matter_id: "matter-demo-1", user_id: "demo-user", role: "owner", joined_at: stamp, user_name: "Demo User", user_email: "demo@patentfoundry.local" },
      { id: "mm-2", matter_id: "matter-demo-1", user_id: "asha", role: "manager", joined_at: stamp, user_name: "Asha Rao", user_email: "asha@patentfoundry.local" },
      { id: "mm-3", matter_id: "matter-demo-1", user_id: "legal", role: "viewer", joined_at: stamp, user_name: "Legal Review", user_email: "legal@patentfoundry.local" },
    ],
    documents: [
      { id: "doc-1", matter_id: "matter-demo-1", uploaded_by_id: "asha", uploaded_by_name: "Asha Rao", filename: "claim-chart-v2.pdf", document_type: "legal", content_type: "application/pdf", size_bytes: 1840000, storage_url: null, description: "Counsel review draft", created_at: stamp },
      { id: "doc-2", matter_id: "matter-demo-1", uploaded_by_id: "demo-user", uploaded_by_name: "Demo User", filename: "device-architecture.png", document_type: "technical", content_type: "image/png", size_bytes: 620000, storage_url: null, description: "Product architecture diagram", created_at: stamp },
    ],
    activity: [
      activity("matter-demo-1", "Changed status from searching to analysis", "matter.status_changed"),
      activity("matter-demo-1", "Attached claim-chart-v2.pdf", "matter.document_added", "matter_document", "doc-1"),
      activity("matter-demo-1", "Assigned Legal Review as viewer", "matter.member_added", "matter_member", "mm-3"),
    ],
    status_history: [
      { id: "sh-1", matter_id: "matter-demo-1", from_status: "searching", to_status: "analysis", changed_by_id: "asha", changed_by_name: "Asha Rao", note: "Prior art sweep complete", created_at: stamp },
      { id: "sh-2", matter_id: "matter-demo-1", from_status: "intake", to_status: "searching", changed_by_id: "demo-user", changed_by_name: "Demo User", note: "Initial search started", created_at: stamp },
    ],
  };
  const m2: Matter = {
    ...m1,
    id: "matter-demo-2",
    matter_number: "MAT-00002",
    title: "Battery Separator Landscape",
    description: "Map ceramic-coated separator families and continuation strategy for EV battery roadmap.",
    client_name: "Northline Energy",
    technology_area: "Battery materials",
    notes: "Prioritize JP/KR family expansion and thermal shutdown claim language.",
    status: "searching",
    priority: "high",
    tags: ["landscape", "battery", "materials"],
    member_count: 2,
    document_count: 1,
    activity_count: 2,
    members: [{ id: "mm-4", matter_id: "matter-demo-2", user_id: "demo-user", role: "owner", joined_at: stamp, user_name: "Demo User", user_email: "demo@patentfoundry.local" }],
    documents: [],
    activity: [activity("matter-demo-2", "Created matter MAT-00002", "matter.created")],
    status_history: [{ id: "sh-3", matter_id: "matter-demo-2", from_status: null, to_status: "searching", changed_by_id: "demo-user", changed_by_name: "Demo User", note: "Landscape search started", created_at: stamp }],
  };
  const m3: Matter = {
    ...m1,
    id: "matter-demo-3",
    matter_number: "MAT-00003",
    title: "Robotics Gripper Novelty Review",
    description: "Patentability matter for soft gripper mechanism, embedded sensing, and control method.",
    client_name: "Forge Robotics",
    technology_area: "Industrial robotics",
    notes: "Inventor interview scheduled. Awaiting final CAD packet.",
    status: "review",
    priority: "medium",
    tags: ["novelty", "robotics", "claims"],
    member_count: 3,
    document_count: 2,
    activity_count: 4,
    members: [{ id: "mm-5", matter_id: "matter-demo-3", user_id: "demo-user", role: "manager", joined_at: stamp, user_name: "Demo User", user_email: "demo@patentfoundry.local" }],
    documents: [],
    activity: [activity("matter-demo-3", "Updated matter notes", "matter.notes_updated")],
    status_history: [{ id: "sh-4", matter_id: "matter-demo-3", from_status: "analysis", to_status: "review", changed_by_id: "demo-user", changed_by_name: "Demo User", note: "Ready for internal claim review", created_at: stamp }],
  };
  return [m1, m2, m3];
}

function replaceMatter(matters: Matter[], matter: Matter) {
  return matters.map((item) => (item.id === matter.id ? { ...item, ...matter } : item));
}


function getLocalMatter(state: MatterState, matterId: string): Matter {
  const matter = state.activeMatter?.id === matterId ? state.activeMatter : state.matters.find((item) => item.id === matterId);
  if (!matter) {
    throw new Error("Matter not found");
  }
  return matter;
}

function localDetail(matter: Matter): Matter {
  return {
    ...matter,
    members: matter.members ?? [],
    documents: matter.documents ?? [],
    activity: matter.activity ?? [],
    status_history: matter.status_history ?? [],
  };
}

export const useMatterStore = create<MatterState>((set, get) => ({
  matters: [],
  activeMatter: null,
  isLoading: false,
  error: null,

  fetchMatters: async () => {
    set({ isLoading: true, error: null });
    try {
      const matters = await matterService.listMatters();
      set({ matters, activeMatter: matters[0] ?? null, isLoading: false });
      return matters;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const matters = get().matters.length ? get().matters : demoMatters();
      set({ matters, activeMatter: get().activeMatter ?? matters[0] ?? null, isLoading: false, error: null });
      return matters;
    }
  },

  fetchMatter: async (id) => {
    try {
      const matter = await matterService.getMatter(id);
      set({ activeMatter: matter, matters: replaceMatter(get().matters, matter) });
      return matter;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const matter = localDetail(get().matters.find((item) => item.id === id) ?? demoMatters()[0]);
      set({ activeMatter: matter });
      return matter;
    }
  },

  setActiveMatter: (matter) => set({ activeMatter: matter }),

  createMatter: async (data) => {
    try {
      const matter = await matterService.createMatter(data);
      set({ matters: [matter, ...get().matters], activeMatter: matter });
      return matter;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const stamp = now();
      const matter: Matter = {
        id: `local-matter-${Date.now()}`,
        owner_id: "demo-user",
        owner_name: "Demo User",
        matter_number: data.matter_number || `MAT-${String(get().matters.length + 1).padStart(5, "0")}`,
        title: data.title,
        description: data.description ?? null,
        workspace_id: data.workspace_id ?? null,
        client_name: data.client_name ?? null,
        technology_area: data.technology_area ?? null,
        notes: data.notes ?? "",
        status: data.status ?? "intake",
        priority: data.priority ?? "medium",
        due_date: data.due_date ?? null,
        tags: data.tags ?? [],
        created_at: stamp,
        updated_at: stamp,
        role: "owner",
        member_count: 1,
        document_count: 0,
        activity_count: 1,
        members: [{ id: `local-member-${Date.now()}`, matter_id: `local-matter-${Date.now()}`, user_id: "demo-user", role: "owner", joined_at: stamp, user_name: "Demo User", user_email: "demo@patentfoundry.local" }],
        documents: [],
        activity: [activity(`local-matter-${Date.now()}`, "Created matter", "matter.created")],
        status_history: [{ id: `local-status-${Date.now()}`, matter_id: `local-matter-${Date.now()}`, from_status: null, to_status: data.status ?? "intake", changed_by_id: "demo-user", changed_by_name: "Demo User", note: "Matter created", created_at: stamp }],
      };
      matter.members = [{ ...(matter.members?.[0] as MatterMember), matter_id: matter.id }];
      matter.activity = [activity(matter.id, `Created matter ${matter.matter_number}`, "matter.created")];
      matter.status_history = [{ ...(matter.status_history?.[0] as NonNullable<Matter["status_history"]>[number]), matter_id: matter.id }];
      set({ matters: [matter, ...get().matters], activeMatter: matter });
      return matter;
    }
  },

  updateMatter: async (id, data) => {
    try {
      const matter = await matterService.updateMatter(id, data);
      set({ matters: replaceMatter(get().matters, matter), activeMatter: matter });
      return matter;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const existing = get().matters.find((item) => item.id === id) ?? get().activeMatter;
      if (!existing) throw error;
      const matter = { ...existing, ...data, updated_at: now(), activity: [activity(id, `Updated matter ${existing.matter_number}`, "matter.updated"), ...(existing.activity ?? [])] } as Matter;
      set({ matters: replaceMatter(get().matters, matter), activeMatter: matter });
      return matter;
    }
  },

  deleteMatter: async (id) => {
    try { await matterService.deleteMatter(id); } catch (error) { if (!unavailable(error)) throw error; }
    const matters = get().matters.filter((item) => item.id !== id);
    set({ matters, activeMatter: get().activeMatter?.id === id ? matters[0] ?? null : get().activeMatter });
  },

  assignMember: async (matterId, data) => get().shareMatter(matterId, data),

  shareMatter: async (matterId, data) => {
    try {
      const member = await matterService.shareMatter(matterId, data);
      await get().fetchMatter(matterId);
      return member;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const matter = localDetail(getLocalMatter(get(), matterId));
      const member: MatterMember = { id: `local-member-${Date.now()}`, matter_id: matterId, user_id: data.user_id ?? data.email ?? `user-${Date.now()}`, role: data.role, joined_at: now(), user_name: data.email?.split("@")[0] ?? "Assigned User", user_email: data.email ?? null };
      const next = { ...matter, members: [member, ...(matter.members ?? [])], member_count: matter.member_count + 1, activity: [activity(matterId, `Assigned ${member.user_name} as ${data.role}`, "matter.member_added", "matter_member", member.id), ...(matter.activity ?? [])], updated_at: now() };
      set({ activeMatter: next, matters: replaceMatter(get().matters, next) });
      return member;
    }
  },

  updateStatus: async (matterId, status, note) => {
    try {
      const matter = await matterService.updateStatus(matterId, status, note);
      await get().fetchMatter(matterId);
      return matter;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const matter = localDetail(getLocalMatter(get(), matterId));
      const next = { ...matter, status, status_history: [{ id: `local-status-${Date.now()}`, matter_id: matterId, from_status: matter.status, to_status: status, changed_by_id: "demo-user", changed_by_name: "Demo User", note: note ?? null, created_at: now() }, ...(matter.status_history ?? [])], activity: [activity(matterId, `Changed status from ${matter.status} to ${status}`, "matter.status_changed"), ...(matter.activity ?? [])], updated_at: now() };
      set({ activeMatter: next, matters: replaceMatter(get().matters, next) });
      return next;
    }
  },

  updateNotes: async (matterId, notes) => {
    try {
      const matter = await matterService.updateNotes(matterId, notes);
      set({ matters: replaceMatter(get().matters, matter), activeMatter: { ...(get().activeMatter ?? matter), ...matter } });
      return matter;
    } catch (error) {
      if (!unavailable(error)) throw error;
      return get().updateMatter(matterId, { notes });
    }
  },

  addDocument: async (matterId, data) => {
    try {
      const doc = await matterService.addDocument(matterId, data);
      await get().fetchMatter(matterId);
      return doc;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const matter = localDetail(getLocalMatter(get(), matterId));
      const doc: MatterDocument = { id: `local-doc-${Date.now()}`, matter_id: matterId, uploaded_by_id: "demo-user", uploaded_by_name: "Demo User", filename: data.filename, document_type: data.document_type, content_type: data.content_type ?? null, size_bytes: data.size_bytes ?? 0, storage_url: data.storage_url ?? null, description: data.description ?? null, created_at: now() };
      const next = { ...matter, documents: [doc, ...(matter.documents ?? [])], document_count: matter.document_count + 1, activity: [activity(matterId, `Attached ${doc.filename}`, "matter.document_added", "matter_document", doc.id), ...(matter.activity ?? [])], updated_at: now() };
      set({ activeMatter: next, matters: replaceMatter(get().matters, next) });
      return doc;
    }
  },

  deleteDocument: async (matterId, documentId) => {
    try { await matterService.deleteDocument(matterId, documentId); } catch (error) { if (!unavailable(error)) throw error; }
    const matter = localDetail(getLocalMatter(get(), matterId));
    const next = { ...matter, documents: (matter.documents ?? []).filter((doc) => doc.id !== documentId), document_count: Math.max(0, matter.document_count - 1), updated_at: now() };
    set({ activeMatter: next, matters: replaceMatter(get().matters, next) });
  },
}));
