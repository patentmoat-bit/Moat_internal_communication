"use client";

import { useState } from "react";
import { FileText, Download, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const auditLogs = [
  { id: "L1", time: "10:45 AM", user: "system_admin", event: "Password Policy Updated", ip: "192.168.1.45", status: "Success" },
  { id: "L2", time: "09:30 AM", user: "analyst_04", event: "OAuth Login", ip: "10.0.0.12", status: "Success" },
  { id: "L3", time: "08:15 AM", user: "unknown", event: "Failed Login (x14)", ip: "45.22.19.8", status: "Failed" },
  { id: "L4", time: "Yesterday", user: "legal_counsel", event: "MFA Setup Configured", ip: "192.168.1.100", status: "Success" },
  { id: "L5", time: "Yesterday", user: "ceo_board", event: "Session Revoked", ip: "172.16.0.4", status: "Success" },
];

export default function AuthenticationLogs() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit &amp; Login Logs</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Immutable record of all authentication and identity events.
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border pb-4">
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-[#c9a84c]" /> Event Ledger</CardTitle>
              <CardDescription className="mt-1">Tracking logins, logouts, policy changes, and failures.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search logs..." 
                  className="pl-9 w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="secondary" size="icon"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">{log.time}</TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>{log.event}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{log.ip}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={
                      log.status === "Success" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" :
                      "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                    }>
                      {log.status}
                    </Badge>
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
