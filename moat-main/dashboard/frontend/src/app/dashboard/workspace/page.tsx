"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Briefcase,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useWorkspaceStore,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceProject,
  type WorkspaceProjectStatus,
  type WorkspaceRole,
} from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";

const roleOptions: WorkspaceRole[] = ["admin", "editor", "viewer"];
const statusOptions: WorkspaceProjectStatus[] = ["active", "on_hold", "completed", "archived"];

const roleTone: Record<WorkspaceRole, string> = {
  owner: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  admin: "border-[#c9a84c]/20 bg-[#c9a84c]/10 text-[#e8c97a]",
  editor: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  viewer: "border-slate-500/20 bg-slate-500/10 text-slate-300",
};

const statusTone: Record<WorkspaceProjectStatus, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  on_hold: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  completed: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  archived: "border-slate-500/20 bg-slate-500/10 text-slate-300",
};

function canManage(role?: WorkspaceRole) {
  return role === "owner" || role === "admin";
}

function canEdit(role?: WorkspaceRole) {
  return role === "owner" || role === "admin" || role === "editor";
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return format(new Date(value), "MMM d, yyyy");
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function WorkspaceModal({ initial, onClose, onSubmit }: {
  initial?: Workspace | null;
  onClose: () => void;
  onSubmit: (name: string, description: string, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Workspace name is required");
    setSaving(true);
    setError("");
    try {
      await onSubmit(name.trim(), description.trim(), notes.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <Card className="relative w-full max-w-xl border-border/70 bg-background shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div><CardTitle className="text-base">{initial ? "Workspace Settings" : "Create Workspace"}</CardTitle><CardDescription className="text-xs">Define the patent research scope and operating notes.</CardDescription></div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Workspace name</label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Battery Separator Landscape" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Research scope</label><Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this workspace is responsible for" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Operating notes</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Save</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectModal({ workspace, initial, onClose, onSubmit }: {
  workspace: Workspace;
  initial?: WorkspaceProject | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; description?: string; status: WorkspaceProjectStatus; owner_id?: string | null; due_date?: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<WorkspaceProjectStatus>(initial?.status ?? "active");
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, status, owner_id: ownerId || null, due_date: dueDate ? new Date(dueDate).toISOString() : null });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <Card className="relative w-full max-w-xl border-border/70 bg-background shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3"><CardTitle className="text-base">{initial ? "Edit Project" : "New Research Project"}</CardTitle><Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" required />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Patent research objective" />
            <div className="grid gap-3 sm:grid-cols-3">
              <select value={status} onChange={(event) => setStatus(event.target.value as WorkspaceProjectStatus)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{statusOptions.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select>
              <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Unassigned</option>{(workspace.members ?? []).map((member) => <option key={member.user_id} value={member.user_id}>{member.user_name || member.user_email}</option>)}</select>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberInvite({ workspaceId }: { workspaceId: string }) {
  const addMember = useWorkspaceStore((state) => state.addMember);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await addMember(workspaceId, { email: email.trim(), role });
      setEmail("");
      setRole("viewer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
      <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="invite patent researcher by email" />
      <select value={role} onChange={(event) => setRole(event.target.value as WorkspaceRole)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}</Button>
    </form>
  );
}

function WorkspaceSwitcher({ workspaces, activeWorkspace, onSelect, onCreate }: {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelect: (workspace: Workspace) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="flex h-11 min-w-[280px] items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 text-left text-sm hover:border-primary/40">
        <span className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{initials(activeWorkspace?.name ?? "WS")}</span><span className="truncate font-semibold">{activeWorkspace?.name ?? "Select workspace"}</span></span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-40 w-[360px] rounded-lg border border-border bg-background p-2 shadow-2xl">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Patent research workspaces</div>
          <div className="max-h-80 space-y-1 overflow-auto">
            {workspaces.map((workspace) => (
              <button key={workspace.id} onClick={() => { onSelect(workspace); setOpen(false); }} className={cn("w-full rounded-md px-3 py-2 text-left hover:bg-muted", activeWorkspace?.id === workspace.id && "bg-muted")}>
                <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{workspace.name}</span><Badge variant="outline" className={roleTone[workspace.role]}>{workspace.role}</Badge></div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{workspace.description || "No research scope"}</p>
              </button>
            ))}
          </div>
          <Separator className="my-2" />
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => { setOpen(false); onCreate(); }}><Plus className="h-4 w-4" />Create workspace</Button>
        </div>
      )}
    </div>
  );
}

function Overview({ workspace, projects, members }: { workspace: Workspace; projects: WorkspaceProject[]; members: WorkspaceMember[] }) {
  const activeProjects = projects.filter((project) => project.status === "active").length;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
      <div className="space-y-4">
        <Card className="border-border/70"><CardHeader><CardTitle className="text-sm">Research Mission</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">{workspace.description || "No mission defined yet."}</CardContent></Card>
        <Card className="border-border/70"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Workspace Notes</CardTitle></CardHeader><CardContent><pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{workspace.notes || "No operating notes yet."}</pre></CardContent></Card>
      </div>
      <div className="grid gap-3">
        <Card className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active projects</p><p className="mt-1 text-2xl font-bold">{activeProjects}</p></CardContent></Card>
        <Card className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Members</p><p className="mt-1 text-2xl font-bold">{members.length || workspace.member_count}</p></CardContent></Card>
        <Card className="border-border/70"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Last updated</p><p className="mt-1 text-sm font-semibold">{formatDate(workspace.updated_at)}</p></CardContent></Card>
      </div>
    </div>
  );
}

function WorkspacePageContent() {
  const { workspaces, activeWorkspace, isLoading, isDetailLoading, error, fetchWorkspaces, setActiveWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, createProject, updateProject, deleteProject, updateMember, removeMember } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [workspaceModal, setWorkspaceModal] = useState<Workspace | "new" | null>(null);
  const [projectModal, setProjectModal] = useState<WorkspaceProject | "new" | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const projects = activeWorkspace?.projects ?? [];
  const members = activeWorkspace?.members ?? [];
  const activity = activeWorkspace?.activity ?? [];
  const filteredProjects = useMemo(() => projects.filter((project) => `${project.name} ${project.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);
  const activeRole = activeWorkspace?.role;

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl space-y-6 pb-16">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <WorkspaceSwitcher workspaces={workspaces} activeWorkspace={activeWorkspace} onSelect={(workspace) => setActiveWorkspace(workspace)} onCreate={() => setWorkspaceModal("new")} />
              {activeWorkspace && <Badge variant="outline" className={roleTone[activeWorkspace.role]}>{activeWorkspace.role}</Badge>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Notion/Linear-style workspace for patent research: scope, projects, members, settings, and activity in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => activeWorkspace && setWorkspaceModal(activeWorkspace)} disabled={!activeWorkspace || !canManage(activeRole)}><Settings className="mr-2 h-4 w-4" />Settings</Button>
            <Button onClick={() => setWorkspaceModal("new")}><Plus className="mr-2 h-4 w-4" />New Workspace</Button>
          </div>
        </div>

        {error && <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />{error}</div>}
        {isLoading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

        {!isLoading && !activeWorkspace && <Card className="border-dashed"><CardContent className="flex min-h-[440px] flex-col items-center justify-center text-center"><Briefcase className="mb-4 h-12 w-12 text-muted-foreground/40" /><h2 className="text-sm font-semibold">Create your first patent research workspace</h2><Button className="mt-4" onClick={() => setWorkspaceModal("new")}><Plus className="mr-2 h-4 w-4" />Create Workspace</Button></CardContent></Card>}

        {activeWorkspace && (
          <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
            <div className="min-w-0 space-y-5">
              <Card className="border-border/70">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{initials(activeWorkspace.name)}</span><div><h1 className="truncate text-2xl font-bold tracking-tight">{activeWorkspace.name}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{activeWorkspace.description || "No research scope provided."}</p></div></div>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarClock className="h-4 w-4" />Created {formatDate(activeWorkspace.created_at)}</span><span className="flex items-center gap-1"><Users className="h-4 w-4" />{members.length || activeWorkspace.member_count} members</span><span className="flex items-center gap-1"><ClipboardList className="h-4 w-4" />{projects.length || activeWorkspace.project_count} projects</span></div>
                    </div>
                    {isDetailLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>

                <TabsContent value="overview"><Overview workspace={activeWorkspace} projects={projects} members={members} /></TabsContent>

                <TabsContent value="projects" className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter projects" className="pl-9" /></div>{canEdit(activeRole) && user?.role !== "CEO" && <Button onClick={() => setProjectModal("new")}><Plus className="mr-2 h-4 w-4" />New Project</Button>}</div>
                  <div className="grid gap-3">
                    {filteredProjects.map((project) => <Card key={project.id} className="border-border/70"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{project.name}</h3><Badge variant="outline" className={statusTone[project.status]}>{project.status.replace("_", " ")}</Badge></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description || "No description"}</p><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>{project.owner_name || "Unassigned"}</span><span>Due {formatDate(project.due_date)}</span><span>Updated {formatDate(project.updated_at)}</span></div></div><div className="flex gap-1">{canEdit(activeRole) && <Button variant="ghost" size="icon" onClick={() => setProjectModal(project)}><Pencil className="h-4 w-4" /></Button>}{canEdit(activeRole) && user?.role === "Admin" && <Button variant="ghost" size="icon" onClick={() => deleteProject(activeWorkspace.id, project.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></CardContent></Card>)}
                    {filteredProjects.length === 0 && <Card><CardContent className="py-10 text-center text-xs text-muted-foreground">No projects match this filter.</CardContent></Card>}
                  </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  {canManage(activeRole) && <MemberInvite workspaceId={activeWorkspace.id} />}
                  <div className="grid gap-3">
                    {members.map((member) => <Card key={member.id} className="border-border/70"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold">{initials(member.user_name || member.user_email || "U")}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.user_name || member.user_email || member.user_id}</p><p className="truncate text-xs text-muted-foreground">{member.user_email || member.user_id}</p></div></div><div className="flex items-center gap-2">{canManage(activeRole) && member.role !== "owner" ? <select value={member.role} onChange={(event) => updateMember(activeWorkspace.id, member.id, event.target.value as WorkspaceRole)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">{roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <Badge variant="outline" className={roleTone[member.role]}>{member.role}</Badge>}{canManage(activeRole) && member.role !== "owner" && <Button variant="ghost" size="icon" onClick={() => removeMember(activeWorkspace.id, member.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></CardContent></Card>)}
                  </div>
                </TabsContent>

                <TabsContent value="activity"><Card className="border-border/70"><CardContent className="divide-y p-0">{activity.length === 0 && <p className="p-8 text-center text-xs text-muted-foreground">No activity yet.</p>}{activity.map((item) => <div key={item.id} className="flex gap-3 p-4"><Activity className="mt-0.5 h-4 w-4 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.message}</p><p className="mt-1 text-xs text-muted-foreground">{item.actor_name || "System"} · {formatDate(item.created_at)}</p></div></div>)}</CardContent></Card></TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card className="border-border/70"><CardHeader><CardTitle className="text-sm">Workspace Settings</CardTitle><CardDescription className="text-xs">Rename, update research scope, and manage operating notes.</CardDescription></CardHeader><CardContent className="space-y-3"><Button variant="outline" onClick={() => setWorkspaceModal(activeWorkspace)} disabled={!canManage(activeRole)}><Settings className="mr-2 h-4 w-4" />Edit workspace details</Button></CardContent></Card>
                  <Card className="border-destructive/30"><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-destructive"><Archive className="h-4 w-4" />Danger Zone</CardTitle><CardDescription className="text-xs">Deleting a workspace removes its projects, members, activity, and research context.</CardDescription></CardHeader><CardContent><Button variant="destructive" disabled={activeRole !== "owner"} onClick={() => { if (confirm(`Delete workspace "${activeWorkspace.name}"?`)) deleteWorkspace(activeWorkspace.id); }}><Trash2 className="mr-2 h-4 w-4" />Delete Workspace</Button></CardContent></Card>
                </TabsContent>
              </Tabs>
            </div>

            <aside className="space-y-4">
              <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary" />Recent Activity</CardTitle></CardHeader><CardContent className="space-y-3">{activity.slice(0, 6).map((item) => <div key={item.id} className="rounded-md border border-border/70 p-3"><p className="text-xs font-medium leading-relaxed">{item.message}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.created_at)}</p></div>)}{activity.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}</CardContent></Card>
              <Card className="border-border/70"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-amber-400" />Access Model</CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-muted-foreground"><p><span className="font-semibold text-foreground">Owner/Admin:</span> settings and members</p><p><span className="font-semibold text-foreground">Editor:</span> project execution</p><p><span className="font-semibold text-foreground">Viewer:</span> read-only research context</p></CardContent></Card>
            </aside>
          </div>
        )}

        {workspaceModal && <WorkspaceModal initial={workspaceModal === "new" ? null : workspaceModal} onClose={() => setWorkspaceModal(null)} onSubmit={async (name, description, notes) => { if (workspaceModal === "new") await createWorkspace(name, description, notes); else await updateWorkspace(workspaceModal.id, name, description, notes); }} />}
        {projectModal && activeWorkspace && <ProjectModal workspace={activeWorkspace} initial={projectModal === "new" ? null : projectModal} onClose={() => setProjectModal(null)} onSubmit={async (payload) => { if (projectModal === "new") await createProject(activeWorkspace.id, payload); else await updateProject(activeWorkspace.id, projectModal.id, payload); }} />}
      </div>
    </ErrorBoundary>
  );
}

export default function WorkspacePage() {
  return <WorkspacePageContent />;
}
