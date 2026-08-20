"use client";

import { useState, useEffect } from "react";
import { Loader2, DollarSign, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance?t=" + new Date().getTime(), {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTransactions(json.data);
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleMarkAsPaid = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const res = await fetch(`/api/finance/${transactionId}/pay`, {
        method: "POST"
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast({ title: "Success", description: "Payment status updated successfully." });
        fetchTransactions();
      } else {
        toast({ title: "Error", description: json.error || "Payment could not be completed. Please try again.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Payment could not be completed. Please try again.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-bold text-foreground">Finance Operations</h2>
        <p className="text-sm text-muted-foreground">Manage payment processing for approved projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500"><CheckCircle2 className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">CEO Approval</p>
            <p className="text-2xl font-bold">{transactions.filter(t => t.ceo_approval_status === "APPROVED" && t.payment_status === "PENDING").length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Clock className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Approval Pending</p>
            <p className="text-2xl font-bold">{transactions.filter(t => t.payment_status === "PENDING").length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><CheckCircle2 className="h-6 w-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold">{transactions.filter(t => t.payment_status === "PAID").length}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 mt-8">
        <h3 className="text-lg font-bold text-foreground">CEO Approval Queue</h3>
        <p className="text-sm text-muted-foreground">Projects approved by the CEO awaiting finance processing.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="py-3 px-4 font-medium">Project</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Assignee</th>
              <th className="py-3 px-4 font-medium">CEO Approval</th>
              <th className="py-3 px-4 font-medium">Approved At</th>
              <th className="py-3 px-4 font-medium">Finance Status</th>
              <th className="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium">{t.project_title}</div>
                  <div className="text-xs text-muted-foreground">ID: {t.project_id.slice(0, 8)}...</div>
                </td>
                <td className="py-3 px-4">{t.ip_type}</td>
                <td className="py-3 px-4">
                  <div className="font-medium text-sm">{t.assignee_name || "Unknown"}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    t.ceo_approval_status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 'bg-slate-500/20 text-slate-500'
                  }`}>
                    {t.ceo_approval_status || "PENDING"}
                  </span>
                </td>
                <td className="py-3 px-4">{t.ceo_approved_at ? new Date(t.ceo_approved_at).toLocaleDateString() : "N/A"}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    t.payment_status === 'PAID' ? 'bg-green-500/20 text-green-500' :
                    t.payment_status === 'UNPAID' ? 'bg-red-500/20 text-red-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {t.payment_status === "PENDING" ? "Pending" : t.payment_status === "PAID" ? "Paid" : "Unpaid"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {t.ceo_approval_status === "APPROVED" && t.payment_status === "PENDING" ? (
                    <button 
                      onClick={() => handleMarkAsPaid(t.id)}
                      disabled={processingId === t.id}
                      className="bg-[#c9a84c] text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-[#b8921e] disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {processingId === t.id ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Processing...</span>
                      ) : "Mark as Paid"}
                    </button>
                  ) : t.payment_status === "PAID" ? (
                    <span className="text-green-500 text-xs font-bold">Paid</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Not Eligible</span>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No pending finance tasks.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
