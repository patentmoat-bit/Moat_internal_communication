"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Settings2, Power, PowerOff, Activity, AlertCircle, Edit, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function NotificationRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbMissing, setDbMissing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_rules")
        .select(`*, notification_templates(name)`)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === '42P01') { // relation does not exist
          setDbMissing(true);
        } else {
          console.error(error);
        }
      } else {
        setRules(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    await supabase.from("notification_rules").update({ status: newStatus }).eq("id", id);
    fetchRules();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (dbMissing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-white">Database Tables Missing</h2>
        <p className="text-slate-400 max-w-md">
          The Notification Rule Engine database tables have not been created yet. Please execute the provided 
          <code className="text-[#c9a84c] bg-black/50 px-2 py-1 rounded ml-2">20260708_notification_engine.sql</code>
          migration file in your Supabase SQL Editor.
        </p>
        <Button onClick={fetchRules} variant="outline" className="border-[#c9a84c] text-[#c9a84c]">
          I've run the SQL - Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Notification Rules</h2>
          <p className="text-sm text-slate-400">Automate and manage system email alerts</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/settings/rules/builder')}
          className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-bold rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Rules", value: rules.length, color: "text-blue-400" },
          { label: "Active Rules", value: rules.filter(r => r.status === 'Active').length, color: "text-emerald-400" },
          { label: "Disabled Rules", value: rules.filter(r => r.status === 'Disabled').length, color: "text-slate-400" },
          { label: "Triggered Today", value: 0, color: "text-purple-400" }, // Mock stat for now
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
            <span className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Settings2 className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>No notification rules configured.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-black/40 text-slate-400 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-black tracking-widest">Rule Name</th>
                <th className="px-6 py-4 font-black tracking-widest">Event Trigger</th>
                <th className="px-6 py-4 font-black tracking-widest">Template</th>
                <th className="px-6 py-4 font-black tracking-widest">Priority</th>
                <th className="px-6 py-4 font-black tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{rule.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{rule.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30">
                      {rule.event_type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{rule.notification_templates?.name || 'Custom'}</td>
                  <td className="px-6 py-4">{rule.priority}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(rule.id, rule.status)}
                        className={rule.status === 'Active' ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10' : 'text-slate-500 hover:text-slate-300'}
                        title={rule.status === 'Active' ? 'Disable' : 'Enable'}
                      >
                        {rule.status === 'Active' ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/settings/rules/builder?id=${rule.id}`)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
