"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DBActivityLog } from "@/services/ceoPatentService";

const TYPE_COLORS: Record<string, string> = {
  idea_submitted:  "#c9a84c",
  patent_filed:    "#06b6d4",
  draft_completed: "#10b981",
  patent_expired:  "#ef4444",
  renewal_reminder:"#8b5cf6",
};

export function NotificationCenter({
  notifications, onMarkRead, onMarkAll,
}: {
  notifications: DBActivityLog[];
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
}) {
  const unread = notifications.filter((n) => n.action === "unread").length;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4.5 w-4.5 text-[#c9a84c]" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#c9a84c] text-black text-[9px] font-black flex items-center justify-center">
                {unread}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-foreground">Notifications</span>
        </div>
        {unread > 0 && (
          <button onClick={onMarkAll} className="flex items-center gap-1 text-[10px] text-[#c9a84c] hover:text-[#e8c97a] transition-colors font-bold">
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>
      <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-8">No notifications</p>
          ) : notifications.map((n) => {
            const accent = TYPE_COLORS[n.metadata?.type] ?? "#c9a84c";
            const isUnread = n.action === "unread";
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${isUnread ? "bg-muted/30" : ""}`}
              >
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 mt-2"
                  style={{ background: isUnread ? accent : "transparent", boxShadow: isUnread ? `0 0 6px ${accent}` : "none" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: accent }}>
                     {n.metadata?.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
                {isUnread && (
                  <button onClick={() => onMarkRead(n.id)}
                    className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground/60 hover:text-[#c9a84c]">
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
