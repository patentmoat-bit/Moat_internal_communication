"use client";

import * as React from "react";
import {
  Inbox,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  FileCheck,
  Bell,
} from "lucide-react";

interface InboxItem {
  id: string;
  type: "APPROVAL_REQUEST" | "ASSIGNMENT" | "DEADLINE" | "MENTION";
  title: string;
  sender_role: "CEO" | "PATENT_ANALYST" | "PATENT_DRAFTER" | "DESIGN_TEAM" | "FINANCE";
  sender_name: string;
  matter_ref: string;
  timestamp: string;
  is_read: boolean;
  priority: "HIGH" | "NORMAL";
  description: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
}

const DEFAULT_INBOX_ITEMS: InboxItem[] = [
  {
    id: "inb-1",
    type: "APPROVAL_REQUEST",
    title: "USPTO 1-Click Filing Signoff Required: MAT-2026-081",
    sender_role: "PATENT_ANALYST",
    sender_name: "Elena Rostova",
    matter_ref: "MAT-2026-081",
    timestamp: "10 mins ago",
    is_read: false,
    priority: "HIGH",
    description: "Quantum-Resistant Lattice Key Exchange specification and Claim Tree passed all Section 101/102/103 checks. Ready for immediate executive signoff.",
  },
  {
    id: "inb-2",
    type: "APPROVAL_REQUEST",
    title: "Statutory Fee Docket Authorization: MAT-2026-094",
    sender_role: "FINANCE",
    sender_name: "Sarah Jenkins",
    matter_ref: "MAT-2026-094",
    timestamp: "1 hour ago",
    is_read: false,
    priority: "HIGH",
    description: "Estimated USPTO statutory filing and attorney disbursement of $12,200 requires executive budget clearance.",
  },
  {
    id: "inb-3",
    type: "ASSIGNMENT",
    title: "Claim Tree Architecture Milestone Reached: MAT-2026-102",
    sender_role: "PATENT_DRAFTER",
    sender_name: "David Chen",
    matter_ref: "MAT-2026-102",
    timestamp: "3 hours ago",
    is_read: true,
    priority: "NORMAL",
    description: "Independent claim 1 and 17 dependent claims completed. Awaiting executive signoff to advance from Claim to Protect stage.",
  },
  {
    id: "inb-4",
    type: "DEADLINE",
    title: "Stage Gate Review: Cryogenic Superconducting Cell MAT-2026-128",
    sender_role: "PATENT_ANALYST",
    sender_name: "Dr. Jennifer Wu",
    matter_ref: "MAT-2026-128",
    timestamp: "Yesterday",
    is_read: true,
    priority: "NORMAL",
    description: "Continuous 72-hour Josephson junction testbench logs verified. Ready to advance to Architect stage.",
  },
];

export default function CommandInboxPage() {
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL");
  const [items, setItems] = React.useState<InboxItem[]>(DEFAULT_INBOX_ITEMS);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [newChatText, setNewChatText] = React.useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedItems = localStorage.getItem("moat_inbox_items");
      if (savedItems) {
        try {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          } else {
            setItems(DEFAULT_INBOX_ITEMS);
          }
        } catch {
          // ignore
        }
      }

      const savedChat = localStorage.getItem("moat_inbox_chat");
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatMessages(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "Active User",
      role: "PATENT_ANALYST",
      text: newChatText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => {
      const updated = [...prev, newMsg];
      if (typeof window !== "undefined") {
        localStorage.setItem("moat_inbox_chat", JSON.stringify(updated));
      }
      return updated;
    });
    setNewChatText("");
  };

  const markAsRead = (id: string) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, is_read: true } : item));
      if (typeof window !== "undefined") {
        localStorage.setItem("moat_inbox_items", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "UNREAD") return !item.is_read;
    return item.type === activeFilter;
  });

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-canvas">
      {/* Left 60%: Command Inbox Action Center */}
      <div className="flex w-3/5 flex-col border-r border-line overflow-hidden">
        <header className="border-b border-line bg-surface/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Command Inbox
                </span>
                <span className="text-xs text-muted">Cross-Role Action Center & Task Gateway</span>
              </div>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
                Action Items & Notifications
              </h1>
            </div>

            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
              {items.filter((i) => !i.is_read).length} Unread Actions
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["ALL", "UNREAD", "APPROVAL_REQUEST", "DEADLINE", "ASSIGNMENT", "MENTION"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  activeFilter === f
                    ? "bg-ink text-canvas shadow-sm"
                    : "border border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </header>

        {/* Action List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
              <Bell className="size-10 text-faint mb-2 opacity-40" />
              <p className="text-xs font-semibold text-ink">Inbox is all caught up</p>
              <p className="text-[11px] text-muted mt-1 max-w-sm">
                No outstanding tasks, deadline alerts, or signoff notifications pending for your active role.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`rounded-xl border p-4 transition-all ${
                  item.is_read
                    ? "border-line bg-surface opacity-80"
                    : "border-blue-500/30 bg-blue-500/5 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{item.matter_ref}</span>
                      <span className="rounded bg-line px-1.5 py-0.5 text-[10px] font-bold text-muted">
                        {item.type.replace("_", " ")}
                      </span>
                      {item.priority === "HIGH" && (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.2 text-[10px] font-bold text-rose-600">
                          URGENT
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-faint">{item.timestamp}</span>
                    <div className="text-[11px] font-medium text-muted mt-1">From: {item.sender_name}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5 text-xs">
                  <span className="text-[11px] text-faint">Role: {item.sender_role}</span>
                  <button className="flex items-center gap-1 font-semibold text-accent hover:underline">
                    Open Project Matter <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right 40%: Real-Time Team Collaboration Messenger */}
      <div className="flex w-2/5 flex-col bg-surface/30 overflow-hidden">
        <header className="border-b border-line bg-surface p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-accent" />
            <h2 className="text-sm font-bold text-ink">Cross-Role Collaboration Chat</h2>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live WebSocket</span>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted h-full">
              <MessageSquare className="size-8 text-faint mb-2 opacity-30" />
              <p className="text-xs font-semibold text-ink">No messages yet</p>
              <p className="text-[11px] text-muted mt-1 max-w-xs">
                Send notes and updates across analyst, drafting, design, and finance roles in real-time.
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-line bg-canvas p-3.5 space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-ink">
                    <span>{msg.sender}</span>
                    <span className="rounded bg-line px-1.5 py-0.2 text-[9px] font-mono text-muted">
                      {msg.role}
                    </span>
                  </div>
                  <span className="text-faint">{msg.time}</span>
                </div>
                <p className="text-xs text-ink leading-relaxed">{msg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendChat} className="border-t border-line bg-surface p-3 flex gap-2">
          <input
            type="text"
            value={newChatText}
            onChange={(e) => setNewChatText(e.target.value)}
            placeholder="Type message across roles..."
            className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
          >
            <Send className="size-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

