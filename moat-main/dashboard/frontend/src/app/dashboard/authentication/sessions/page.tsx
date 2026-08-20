"use client";

import { useState } from "react";
import { Users, Power, ShieldAlert, Smartphone, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

const initialSessions = [
  { id: "s1", user: "system_admin", role: "Admin", device: "MacBook Pro", browser: "Chrome", ip: "192.168.1.45", location: "San Francisco, CA", loginTime: "2 hours ago", status: "Active" },
  { id: "s2", user: "analyst_04", role: "Patent Analyst", device: "Windows PC", browser: "Edge", ip: "10.0.0.12", location: "New York, NY", loginTime: "5 hours ago", status: "Idle" },
  { id: "s3", user: "ceo_board", role: "CEO", device: "iPhone 14", browser: "Safari", ip: "172.16.0.4", location: "London, UK", loginTime: "1 day ago", status: "Active" },
  { id: "s4", user: "legal_counsel", role: "Legal Team", device: "iPad Pro", browser: "Safari", ip: "192.168.1.100", location: "San Francisco, CA", loginTime: "3 days ago", status: "Expired" },
];

export default function SessionManagement() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);

  const handleRevoke = (id: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, status: "Revoked" } : s));
    toast({
      title: "Session Revoked",
      description: "The user has been forcibly logged out of that device.",
    });
  };

  const handleTerminateAll = () => {
    setIsTerminatingAll(true);
    setTimeout(() => {
      setSessions(sessions.map(s => s.role !== "Admin" ? { ...s, status: "Revoked" } : s));
      setIsTerminatingAll(false);
      toast({
        title: "All Sessions Terminated",
        description: "All non-admin users have been forcibly logged out.",
        variant: "destructive"
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Active Sessions</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor and manage active user sessions across the platform.
          </p>
        </div>
        <Button variant="destructive" onClick={handleTerminateAll} disabled={isTerminatingAll}>
          <Power className="w-4 h-4 mr-2" />
          {isTerminatingAll ? "Terminating..." : "Terminate All Sessions"}
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-[#c9a84c]" /> Session Directory</CardTitle>
          <CardDescription>A real-time view of currently authenticated devices.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location / IP</TableHead>
                <TableHead>Login Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="font-semibold">{session.user}</div>
                    <div className="text-xs text-muted-foreground">{session.role}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {session.device.includes("iPhone") || session.device.includes("iPad") ? (
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{session.device}</div>
                        <div className="text-xs text-muted-foreground">{session.browser}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{session.location}</div>
                    <div className="text-xs text-muted-foreground">{session.ip}</div>
                  </TableCell>
                  <TableCell className="text-sm">{session.loginTime}</TableCell>
                  <TableCell>
                    <Badge className={
                      session.status === "Active" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" :
                      session.status === "Idle" ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" :
                      "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                    }>
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRevoke(session.id)}
                      disabled={session.status === "Revoked" || session.status === "Expired"}
                      className="text-xs"
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
