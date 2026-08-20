"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, ShieldAlert, Laptop, Smartphone, Globe, Clock, XCircle, Loader2 } from "lucide-react";

function getRelativeTime(dateString: string) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMins = Math.floor(diffInSeconds / 60);
  if (diffInMins < 60) return `${diffInMins} min${diffInMins !== 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

export default function SessionManagementPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = () => {
    setError(null);
    fetch("/api/iam/sessions")
      .then(res => {
         if (!res.ok) throw new Error("Network response was not ok");
         return res.json();
      })
      .then(data => {
        if (data.sessions) {
          setSessions(data.sessions);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch sessions, could be offline or missing API:", err);
        setError("Failed to load sessions. Please check your connection and try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await fetch(`/api/iam/sessions?id=${id}`, { method: "DELETE" });
      setSessions(s => s.filter(x => x.id !== id));
    } catch (e) {
      console.error("Failed to revoke session", e);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Are you sure you want to revoke ALL active sessions? Users will be instantly logged out.")) return;
    try {
      await fetch(`/api/iam/sessions?id=all`, { method: "DELETE" });
      setSessions([]);
    } catch (e) {
      console.error("Failed to revoke all sessions", e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Monitor className="h-8 w-8 text-[#c9a84c]" />
            Session Management
          </h2>
          <p className="text-muted-foreground mt-2">
            Monitor and control active user sessions across all devices.
          </p>
        </div>
        <button 
          onClick={handleRevokeAll}
          className="flex items-center gap-2 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 font-bold px-4 py-2 rounded-lg transition-colors border border-red-500/20"
        >
          <ShieldAlert className="h-4 w-4" />
          Revoke All Active Sessions
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p>
          </div>
          <button 
            onClick={() => {
              setLoading(true);
              fetchSessions();
            }}
            className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      )}

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Active Sessions</CardTitle>
          <CardDescription className="text-muted-foreground">Currently valid JWT tokens and active browser connections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">User</th>
                  <th className="px-4 py-3">Device & Browser</th>
                  <th className="px-4 py-3">Location & IP</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{session.user}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {session.device.includes('iPhone') || session.device.includes('Mobile') ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Laptop className="h-4 w-4 text-muted-foreground" />}
                        <div className="min-w-0">
                          <div className="truncate max-w-[200px]">{session.device}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{session.browser === "Unknown Browser" ? "" : session.browser}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{session.location}</div>
                          <div className="text-xs text-muted-foreground">{session.ip}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="whitespace-nowrap">{getRelativeTime(session.lastActive)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleRevoke(session.id)}
                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center justify-end w-full gap-1 font-medium"
                      >
                        <XCircle className="h-4 w-4" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No active sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
