"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlusCircle, UploadCloud, Sparkles, Download, FileText, FolderOpen, FlaskConical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ceoPatentService } from "@/services/ceoPatentService";

const ACTIONS = [
  { id: "idea",   label: "Add to MOAT",         icon: FlaskConical, color: "#c9a84c" },
  { id: "upload", label: "Upload Invention",    icon: UploadCloud,  color: "#06b6d4" },
  { id: "draft",  label: "Draft Patent",        icon: FileText,     color: "#10b981" },
  { id: "ai",     label: "Generate AI Draft",   icon: Sparkles,     color: "#8b5cf6" },
  { id: "portfolio", label: "Open Portfolio",   icon: FolderOpen,   color: "#f59e0b" },
  { id: "export", label: "Export Report",       icon: Download,     color: "#ef4444" },
];

export function QuickActions({ onRefresh, projects }: { onRefresh: () => void; projects: any[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc]   = useState("");
  const [tags, setTags]   = useState("");
  const [status, setStatus] = useState("drafting");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
          const defaultAnalyst = data.find((u: any) => u.role === "Patent Analyst");
          if (defaultAnalyst) {
            setAssignedTo(defaultAnalyst.id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleExport = () => {
    const rows = [["ID","Title","Status","Tags","Updated"],
      ...projects.map(p => [p.id, p.title, p.status, p.tags.join(";"), new Date(p.updated_at).toLocaleDateString()])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv],{type:"text/csv"})), download:"patent_report.csv" });
    a.click();
  };

  const handleAction = (id: string) => {
    if (id === "export") { handleExport(); return; }
    if (id === "portfolio") { window.open("/dashboard/ceo/portfolio","_self"); return; }
    setOpen(id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const finalAssignee = assignedTo === "none" ? undefined : assignedTo;
      await ceoPatentService.createProjectIdea(title, desc, status, tags.split(",").map(t=>t.trim()).filter(Boolean), finalAssignee);
      setOpen(null); setTitle(""); setDesc(""); setTags(""); setStatus("drafting"); setAssignedTo("");
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || JSON.stringify(err));
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleAction(a.id)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-colors group"
            >
              <div className="p-2 rounded-lg transition-transform group-hover:scale-110"
                style={{ background: `${a.color}18`, boxShadow: `0 0 12px ${a.color}10` }}>
                <a.icon className="h-4 w-4" style={{ color: a.color }} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Create Idea Modal */}
      <Dialog open={open === "idea" || open === "draft" || open === "upload"} onOpenChange={() => setOpen(null)}>
        <DialogContent className="border-border bg-popover text-popover-foreground max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#c9a84c] font-black">
              {open === "upload" ? "Upload Invention Document" : "Add Idea to MOAT Vault"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              {open === "upload" ? "Saved directly to your Supabase project catalog." : "Save a new strategic project or idea for the Patent Analyst to review."}
            </DialogDescription>
          </DialogHeader>
          {saveError && (
            <div className="bg-red-500/20 text-red-500 border border-red-500/50 p-2 rounded-xl text-xs font-bold mb-2">
              Error: {saveError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Smart Cooling Grid System"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</Label>
              <textarea rows={3} value={desc} onChange={e=>setDesc(e.target.value)}
                placeholder="Describe the key technical innovation..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tags</Label>
                <Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="AI, Hardware"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-background border-border text-foreground rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent sideOffset={4} className="rounded-xl border-border font-medium">
                    {["drafting","pending","filed","approved","search"].map(s => (
                      <SelectItem key={s} value={s} className="capitalize cursor-pointer font-medium">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assign To (Patent Analyst)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="bg-background border-border text-foreground rounded-xl text-sm">
                  <SelectValue placeholder="Select analyst..." />
                </SelectTrigger>
                <SelectContent sideOffset={4} className="rounded-xl border-border font-medium">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.filter(u => u.role === "Patent Analyst" || u.role === "Admin").map(u => (
                    <SelectItem key={u.id} value={u.id} className="cursor-pointer font-medium">
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(null)} className="text-muted-foreground hover:bg-muted">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-bold rounded-xl">
                {saving ? "Saving…" : "Save to Database"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
