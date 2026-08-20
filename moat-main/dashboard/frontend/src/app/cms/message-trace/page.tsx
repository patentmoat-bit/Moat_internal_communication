"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Calendar, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function MessageTraceCMS() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    recipient: "",
    subject: "",
    status: "All"
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        recipient: filters.recipient,
        subject: filters.subject,
        status: filters.status
      });

      const res = await fetch(`/api/settings/message-trace?${params.toString()}`);
      const result = await res.json();
      
      if (result.data) {
        setLogs(result.data);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error fetching trace logs",
        description: "Failed to load message trace from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Sent': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Trace</h1>
          <p className="text-muted-foreground mt-2">
            Find all messages or specific messages sent to recipients based on notification rules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">New message trace</CardTitle>
            <CardDescription>Refine your search by adjusting the settings below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipients</Label>
              <Input 
                id="recipient" 
                placeholder="All" 
                value={filters.recipient}
                onChange={(e) => setFilters({...filters, recipient: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject" 
                placeholder="starts with..." 
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Delivery status</Label>
              <Select 
                value={filters.status}
                onValueChange={(val) => setFilters({...filters, status: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchLogs} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="md:col-span-3">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Running trace...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p>No messages found matching your criteria.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date (UTC)</TableHead>
                    <TableHead>Subject / Rule</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const recipientText = log.recipients ? JSON.stringify(log.recipients) : "Unknown";
                    const dateObj = new Date(log.created_at);
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.subject || "No Subject"}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Rule: {log.notification_rules?.name || "Manual Send"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {recipientText.replace(/[{"\[\]}]/g, '')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="text-sm">{log.status}</span>
                          </div>
                          {log.error_message && (
                            <div className="text-xs text-rose-500 mt-1 max-w-[150px] truncate" title={log.error_message}>
                              {log.error_message}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
