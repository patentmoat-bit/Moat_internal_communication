"use client";

import { useState } from "react";
import { 
  Bell, Search, Filter, Check, Archive, Trash2, 
  AlertTriangle, ShieldAlert, FileText, CheckCircle2,
  Clock, MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "High" | "Medium" | "Low";

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: Priority;
  project: string;
  role: string;
  timestamp: string;
  isRead: boolean;
  isArchived: boolean;
  type: "security" | "workflow" | "system" | "upload";
}

const initialMockNotifications: Notification[] = [
  {
    id: "n1",
    title: "High Severity AI Insight Detected",
    message: "Critical prior art landscape shift regarding 'Quantum Encryption Method'.",
    priority: "High",
    project: "Quantum Encryption",
    role: "Patent Analyst",
    timestamp: "2 mins ago",
    isRead: false,
    isArchived: false,
    type: "security"
  },
  {
    id: "n2",
    title: "CEO Approval Required",
    message: "Final review requested for Neural Network Training Patent filing.",
    priority: "High",
    project: "Neural Network Training",
    role: "CEO",
    timestamp: "1 hour ago",
    isRead: false,
    isArchived: false,
    type: "workflow"
  },
  {
    id: "n3",
    title: "New Document Uploaded",
    message: "John Doe uploaded 'Draft_Claims_v2.docx'.",
    priority: "Medium",
    project: "Quantum Encryption",
    role: "Patent Analyst",
    timestamp: "3 hours ago",
    isRead: true,
    isArchived: false,
    type: "upload"
  },
  {
    id: "n4",
    title: "PFS Status Changed",
    message: "Patent Filing Strategy status moved to 'Drafting'.",
    priority: "Low",
    project: "Solid State Battery",
    role: "Patent Analyst",
    timestamp: "1 day ago",
    isRead: true,
    isArchived: false,
    type: "workflow"
  },
  {
    id: "n5",
    title: "Permission Drift Detected",
    message: "Elevated access detected for user account jsmith@moat.io.",
    priority: "High",
    project: "System",
    role: "Admin",
    timestamp: "1 day ago",
    isRead: true,
    isArchived: false,
    type: "system"
  }
];

export default function NotificationCenter() {
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [notifications, setNotifications] = useState(initialMockNotifications);

  const filteredNotifications = notifications.filter(n => {
    if (n.isArchived) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.message.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedProject !== "All" && n.project !== selectedProject) return false;
    if (selectedRole !== "All" && n.role !== selectedRole) return false;
    if (selectedPriority !== "All" && n.priority !== selectedPriority) return false;
    return true;
  });

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const markRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const archiveItem = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isArchived: true } : n));
  };

  const archiveAllRead = () => {
    setNotifications(notifications.map(n => n.isRead ? { ...n, isArchived: true } : n));
  };

  const deleteItem = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string, priority: Priority) => {
    if (type === "security") return <ShieldAlert className={cn("h-5 w-5", priority === "High" ? "text-red-500" : "text-[#c9a84c]")} />;
    if (type === "workflow") return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
    if (type === "system") return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (type === "upload") return <FileText className="h-5 w-5 text-emerald-500" />;
    return <Bell className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notification Center</h2>
          <p className="text-sm text-muted-foreground">Manage your in-app alerts, workflow updates, and security notices.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="flex items-center gap-2 bg-background border border-border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Check className="h-4 w-4" /> Mark All Read
          </button>
          <button onClick={archiveAllRead} className="flex items-center gap-2 bg-background border border-border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Archive className="h-4 w-4" /> Archive Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search alerts..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 appearance-none"
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
        >
          <option value="All">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>
        <select 
          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 appearance-none"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="All">All Projects</option>
          <option value="Quantum Encryption">Quantum Encryption</option>
          <option value="Neural Network Training">Neural Network Training</option>
          <option value="Solid State Battery">Solid State Battery</option>
          <option value="System">System Alerts</option>
        </select>
        <select 
          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 appearance-none"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <option value="All">All Roles</option>
          <option value="Patent Analyst">Patent Analyst</option>
          <option value="CEO">CEO</option>
          <option value="Admin">Admin</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-border/50">
          {filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-4 opacity-20" />
              <p>No notifications found matching your filters.</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={cn(
                  "p-5 flex flex-col md:flex-row md:items-center gap-4 transition-colors hover:bg-muted/30 group cursor-pointer relative",
                  !notification.isRead ? "bg-[#c9a84c]/5" : ""
                )}
              >
                {!notification.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#c9a84c]" />
                )}
                <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-background border border-border shadow-sm">
                  {getIcon(notification.type, notification.priority)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn("text-sm truncate", !notification.isRead ? "font-bold text-foreground" : "font-semibold text-foreground/80")}>
                      {notification.title}
                    </h4>
                    {notification.priority === "High" && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                        High Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{notification.message}</p>
                  
                  <div className="flex items-center gap-3 mt-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {notification.timestamp}</span>
                    <span>&bull;</span>
                    <span>Project: <span className="text-foreground">{notification.project}</span></span>
                    <span>&bull;</span>
                    <span>Role: <span className="text-foreground">{notification.role}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-end md:self-center">
                  {!notification.isRead && (
                    <button onClick={(e) => { e.stopPropagation(); markRead(notification.id); }} className="p-2 bg-background border border-border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors shadow-sm" title="Mark Read">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); archiveItem(notification.id); }} className="p-2 bg-background border border-border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors shadow-sm" title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem(notification.id); }} className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-red-600 transition-colors shadow-sm" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
