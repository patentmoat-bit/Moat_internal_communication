"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Plus, Trash2, Mail, Layers, Users, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const EVENT_CATALOG = [
  { group: "Patent Events", events: ["PROJECT_CREATED", "PROJECT_ASSIGNED", "RESEARCH_STARTED", "REPORT_SUBMITTED", "CEO_APPROVED", "CEO_REJECTED", "REVISION_REQUIRED", "REVISION_COMPLETED", "FILING_STARTED", "FILED", "RENEWAL_REMINDER", "PROJECT_COMPLETED"] },
  { group: "Document Events", events: ["DOCUMENT_UPLOADED", "DOCUMENT_DELETED"] },
  { group: "Design Events", events: ["DESIGN_REQUESTED", "DESIGN_STARTED", "DESIGN_COMPLETED"] }
];

export default function RuleBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("");
  const [priority, setPriority] = useState("Normal");
  
  // Recipients
  const [recipients, setRecipients] = useState([{ type: 'ROLE', value: 'Patent Analyst', routing: 'TO' }]);
  
  // Conditions
  const [conditions, setConditions] = useState([{ field: 'Priority', operator: 'EQUALS', value: 'High' }]);

  const handleSave = async () => {
    if (!ruleName || !eventType) {
      toast({ title: "Error", description: "Rule Name and Event Trigger are required.", variant: "destructive" });
      return;
    }
    toast({ title: "Saving Rule...", description: "Configuring automated routing." });
    try {
      const res = await fetch("/api/settings/notification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          description,
          event_type: eventType,
          priority,
          status: "Active",
          recipients, // The updated API will process this generic payload
          conditions  // The updated API will process this generic payload
        })
      });
      if (!res.ok) throw new Error("Failed to save rule");
      toast({ title: "Success", description: "Rule saved successfully." });
      router.push('/dashboard/settings/rules');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/settings/rules')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Notification Rule</h2>
            <p className="text-sm text-slate-400">Design a new automated email routing rule</p>
          </div>
        </div>
        <Button onClick={handleSave} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-bold px-6">
          <Save className="mr-2 h-4 w-4" /> Save Rule
        </Button>
      </div>

      <div className="grid gap-6">
        
        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-[#c9a84c]">
            <Layers className="h-5 w-5" />
            <h3 className="text-lg font-black tracking-widest uppercase text-white">1. Rule Configuration</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-400">Rule Name</Label>
              <Input value={ruleName} onChange={e=>setRuleName(e.target.value)} placeholder="e.g. High Priority Patent Filed" className="bg-black/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-400">Description</Label>
              <Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Briefly describe what this rule does" className="bg-black/50 border-border/50" />
            </div>
          </div>
        </motion.div>

        {/* Trigger */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Zap className="h-5 w-5" />
            <h3 className="text-lg font-black tracking-widest uppercase text-white">2. Event Trigger</h3>
          </div>
          <div className="space-y-2 max-w-md">
            <Label className="text-xs uppercase tracking-wider text-slate-400">When this event happens:</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-black/50 border-border/50">
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATALOG.map(group => (
                  <div key={group.group}>
                    <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase">{group.group}</div>
                    {group.events.map(ev => <SelectItem key={ev} value={ev}>{ev}</SelectItem>)}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Recipients */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <Users className="h-5 w-5" />
            <h3 className="text-lg font-black tracking-widest uppercase text-white">3. Recipients</h3>
          </div>
          <div className="space-y-3">
            {recipients.map((rec, i) => (
              <div key={i} className="flex gap-2 items-center bg-black/20 p-2 rounded-lg border border-border/30">
                <Select value={rec.routing} onValueChange={v => { const n = [...recipients]; n[i].routing = v; setRecipients(n); }}>
                  <SelectTrigger className="w-[100px] bg-black/50 border-border/50"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="TO">TO</SelectItem><SelectItem value="CC">CC</SelectItem><SelectItem value="BCC">BCC</SelectItem></SelectContent>
                </Select>
                <Select value={rec.type} onValueChange={v => { const n = [...recipients]; n[i].type = v; setRecipients(n); }}>
                  <SelectTrigger className="w-[150px] bg-black/50 border-border/50"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="ROLE">System Role</SelectItem><SelectItem value="PROJECT_FIELD">Dynamic Field</SelectItem><SelectItem value="SPECIFIC_USER">Specific User</SelectItem></SelectContent>
                </Select>
                <Input value={rec.value} onChange={e => { const n = [...recipients]; n[i].value = e.target.value; setRecipients(n); }} placeholder="e.g. CEO, assigned_to" className="bg-black/50 border-border/50" />
                <Button variant="ghost" size="icon" onClick={() => setRecipients(recipients.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRecipients([...recipients, { type: 'ROLE', value: '', routing: 'TO' }])} className="border-emerald-500/30 text-emerald-400">
              <Plus className="h-4 w-4 mr-2" /> Add Recipient
            </Button>
          </div>
        </motion.div>

        {/* Conditions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Search className="h-5 w-5" />
            <h3 className="text-lg font-black tracking-widest uppercase text-white">4. Conditions (Optional)</h3>
          </div>
          <div className="space-y-3">
            {conditions.map((cond, i) => (
              <div key={i} className="flex gap-2 items-center bg-black/20 p-2 rounded-lg border border-border/30">
                <span className="text-xs font-black text-slate-500 w-12 text-center">{i === 0 ? 'IF' : 'AND'}</span>
                <Input value={cond.field} onChange={e => { const n = [...conditions]; n[i].field = e.target.value; setConditions(n); }} placeholder="Metadata Field (e.g. priority)" className="bg-black/50 border-border/50" />
                <Select value={cond.operator} onValueChange={v => { const n = [...conditions]; n[i].operator = v; setConditions(n); }}>
                  <SelectTrigger className="w-[180px] bg-black/50 border-border/50"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EQUALS">Equals</SelectItem>
                    <SelectItem value="NOT_EQUALS">Not Equals</SelectItem>
                    <SelectItem value="CONTAINS">Contains</SelectItem>
                    <SelectItem value="GREATER_THAN">Greater Than</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={cond.value} onChange={e => { const n = [...conditions]; n[i].value = e.target.value; setConditions(n); }} placeholder="Value" className="bg-black/50 border-border/50" />
                <Button variant="ghost" size="icon" onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setConditions([...conditions, { field: '', operator: 'EQUALS', value: '' }])} className="border-blue-500/30 text-blue-400">
              <Plus className="h-4 w-4 mr-2" /> Add Condition
            </Button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
