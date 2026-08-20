"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertCircle, FileText, Zap, Clock, X } from "lucide-react";
import { DBAlert } from "@/services/ceoPatentService";

const ALERT_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    approval: { icon: ShieldAlert, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
    deadline: { icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
    office_action: { icon: FileText, color: "#06b6d4", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.2)" },
    renewal: { icon: Zap, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
    meeting: { icon: Clock, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
};

export function AlertsPanel({ alerts, onDismiss }: { alerts: DBAlert[]; onDismiss: (id: string) => void }) {
    return (
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#c9a84c]" />
                    <span className="text-sm font-bold text-foreground">Executive Alerts</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20">
                    {alerts.length} Active
                </span>
            </div>
            <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                <AnimatePresence initial={false}>
                    {alerts.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 text-center py-6">No active alerts</p>
                    ) : alerts.map((a, i) => {
                        const cfg = ALERT_CFG[a.alert_type] ?? ALERT_CFG.office_action;
                        return (
                            <motion.div
                                key={a.id}
                                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-start gap-3 p-3 rounded-xl border group"
                                style={{ background: cfg.bg, borderColor: cfg.border }}
                            >
                                <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${cfg.color}22` }}>
                                    <cfg.icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground/90 leading-tight">{a.name}</p>
                                    {a.description && (
                                        <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{a.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => onDismiss(a.id)}
                                    className="shrink-0 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground/60 hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
