"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Filter, Download, ShieldAlert, CheckCircle, Lock, Key, Smartphone, FileSignature, Loader2 } from "lucide-react";

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/iam/audit-logs");
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err: any) {
      setError(err.message || "NetworkError when attempting to fetch resource");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('audit_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('SUCCESS')) return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (action.includes('FAILED')) return <ShieldAlert className="h-4 w-4 text-red-500 dark:text-red-400" />;
    if (action.includes('LOCKED')) return <Lock className="h-4 w-4 text-red-600 dark:text-red-500" />;
    if (action.includes('PASSWORD')) return <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    if (action.includes('MFA')) return <Smartphone className="h-4 w-4 text-[#c9a84c]" />;
    return <FileSignature className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusClass = (status: string) => {
    if (status === 'success') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (status === 'failed') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (status === 'critical') return 'bg-red-600/20 text-red-700 dark:text-red-500 border-red-600/30 font-bold';
    return 'bg-muted text-foreground border-border';
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.user.toLowerCase().includes(search.toLowerCase()) || 
    log.ip.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-[#c9a84c]" />
            Security Audit Logs
          </h2>
          <p className="text-muted-foreground mt-2">
            Immutable record of all IAM and security events.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 border border-border text-foreground px-4 py-2 rounded-lg transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search events, users, or IPs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button className="flex items-center gap-2 bg-muted border border-border text-foreground px-3 py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors">
                <Filter className="h-4 w-4" /> Filter
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Event Time</th>
                  <th className="px-6 py-3 font-medium">Category / Action</th>
                  <th className="px-6 py-3 font-medium">Actor</th>
                  <th className="px-6 py-3 font-medium">Resource</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                        <p>{error}</p>
                        <button onClick={fetchData} className="mt-2 text-xs bg-red-500/10 text-red-500 px-3 py-1 rounded hover:bg-red-500/20">
                          Retry Connection
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No audit logs found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                        {log.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{log.category}</span>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="font-semibold text-foreground">{log.action}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground text-sm font-medium">{log.user}</span>
                          <span className="text-[10px] text-muted-foreground">{log.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                           <span className="font-semibold text-xs text-foreground">{log.resourceType}</span>
                           <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{log.resourceName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SECURE DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
           <Card className="w-full max-w-2xl bg-card border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <CardHeader className="bg-muted/20 border-b border-border/50 py-4 flex flex-row items-start justify-between">
                 <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                       <ShieldAlert className="h-5 w-5 text-[#c9a84c]" /> Secure Audit Event Details
                    </CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">Event ID: {selectedLog.id}</CardDescription>
                 </div>
                 <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
                 <div className="p-6 space-y-6">
                    {/* Context Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Actor</p>
                          <p className="font-semibold">{selectedLog.user}</p>
                       </div>
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Role</p>
                          <p className="font-semibold">{selectedLog.role}</p>
                       </div>
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Action</p>
                          <p className="font-mono text-xs text-[#c9a84c] bg-[#c9a84c]/10 px-2 py-1 rounded w-fit mt-1">{selectedLog.action}</p>
                       </div>
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Category</p>
                          <p className="font-semibold">{selectedLog.category}</p>
                       </div>
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Timestamp</p>
                          <p className="font-mono text-xs mt-1">{selectedLog.time}</p>
                       </div>
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Status</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-block mt-1 ${getStatusClass(selectedLog.status)}`}>
                             {selectedLog.status}
                          </span>
                       </div>
                    </div>

                    <div className="h-px bg-border/50 w-full" />

                    {/* Infrastructure Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Source IP Address</p>
                          <p className="font-mono text-xs mt-1">{selectedLog.ip}</p>
                       </div>
                       <div>
                          <p className="text-muted-foreground text-xs font-bold uppercase">Resource Affected</p>
                          <p className="font-semibold text-xs mt-1">{selectedLog.resourceType} • {selectedLog.resourceName}</p>
                       </div>
                       <div className="col-span-2">
                          <p className="text-muted-foreground text-xs font-bold uppercase">User Agent</p>
                          <p className="font-mono text-xs mt-1 break-words">{selectedLog.userAgent}</p>
                       </div>
                    </div>

                    {/* State Changes */}
                    {(selectedLog.oldValue || selectedLog.newValue) && (
                       <>
                          <div className="h-px bg-border/50 w-full" />
                          <div>
                             <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <FileSignature className="h-4 w-4 text-blue-500" /> State Mutation Tracking
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                   <div className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border border-red-500/20">Before Change</div>
                                   <pre className="p-3 bg-muted/40 border border-border/50 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto">
                                      {JSON.stringify(selectedLog.oldValue || {}, null, 2)}
                                   </pre>
                                </div>
                                <div className="space-y-1.5">
                                   <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border border-emerald-500/20">After Change</div>
                                   <pre className="p-3 bg-muted/40 border border-border/50 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto">
                                      {JSON.stringify(selectedLog.newValue || {}, null, 2)}
                                   </pre>
                                </div>
                             </div>
                             <p className="text-[10px] text-muted-foreground mt-2 italic">Note: Secrets and tokens are securely masked by the AuditLogService.</p>
                          </div>
                       </>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
