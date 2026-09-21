"use client";

import * as React from "react";
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertOctagon,
  FileText,
  DollarSign,
  ArrowDownToLine,
  Filter,
  CreditCard,
  Building,
  Plus,
  Receipt,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  matter_ref: string;
  title: string;
  payee: string;
  fee_type: "USPTO_FILING_FEE" | "ATTORNEY_DRAFTING_FEE" | "PRIOR_ART_SEARCH" | "MAINTENANCE_FEE";
  amount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "EXCEPTION";
  due_date: string;
  invoice_ref: string;
}

export default function FinancePaymentsPage() {
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [filterStatus, setFilterStatus] = React.useState<string>("ALL");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moat_financial_ledger");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPayments(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleUpdateStatus = (id: string, newStatus: PaymentRecord["status"]) => {
    setPayments((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
      if (typeof window !== "undefined") {
        localStorage.setItem("moat_financial_ledger", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const filtered = payments.filter((p) => filterStatus === "ALL" || p.status === filterStatus);

  const totalAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = payments
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((acc, p) => acc + p.amount, 0);
  const paidAmount = payments
    .filter((p) => p.status === "PAID")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Finance Suite
            </span>
            <span className="text-xs text-muted">Patent Office Fees & Attorney Disbursement Docket</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            IP Payment & Filing Fee Docket
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("No payments to export")}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:border-line-strong transition"
          >
            <ArrowDownToLine className="size-3.5" />
            Export Ledger CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Commitments</span>
            <DollarSign className="size-4 text-accent" />
          </div>
          <div className="text-3xl font-black text-ink">${totalAmount.toLocaleString()}</div>
          <div className="text-[11px] text-muted">{payments.length} active invoices & fee items</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Disbursement</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">${pendingAmount.toLocaleString()}</div>
          <div className="text-[11px] text-amber-600 font-medium">Awaiting finance approval / wire</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Paid & Settled (YTD)</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">${paidAmount.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 font-medium">USPTO verified receipts stored</div>
        </div>
      </div>

      {/* Payment Docket Table */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-ink">Project Payment Ledger</h2>
            <p className="text-xs text-muted">
              Track and settle statutory patent office filing fees and external attorney drafting disbursements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-faint" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink outline-none"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="PROCESSING">Processing Wire</option>
              <option value="PAID">Paid & Settled</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-canvas">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface font-semibold text-muted">
              <tr>
                <th className="p-3.5">Matter Ref</th>
                <th className="p-3.5">Fee Classification</th>
                <th className="p-3.5">Payee Organization</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted">
                    <Receipt className="size-8 text-faint mb-2 opacity-40 mx-auto" />
                    <p className="font-semibold text-ink text-xs">No fee items or invoices logged</p>
                    <p className="text-[11px] text-muted mt-1 max-w-sm mx-auto">
                      Statutory USPTO/EPO deposit fees and outside counsel invoices will be scheduled here when research matters advance to filing.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-hover/50">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-accent">{item.matter_ref}</div>
                      <div className="text-[11px] text-muted truncate max-w-xs">{item.title}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="rounded bg-line px-2 py-0.5 font-mono text-[10px] font-semibold text-ink">
                        {item.fee_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-ink">{item.payee}</td>
                    <td className="p-3.5 text-muted">{item.due_date}</td>
                    <td className="p-3.5 font-mono font-bold text-ink">${item.amount.toLocaleString()}</td>
                    <td className="p-3.5">
                      {item.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 className="size-3" /> PAID
                        </span>
                      )}
                      {item.status === "PROCESSING" && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                          <Clock className="size-3" /> PROCESSING
                        </span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Clock className="size-3" /> PENDING
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {item.status === "PENDING" && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, "PROCESSING")}
                          className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700"
                        >
                          Process Wire
                        </button>
                      )}
                      {item.status === "PROCESSING" && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, "PAID")}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700"
                        >
                          Mark as Settled
                        </button>
                      )}
                      {item.status === "PAID" && (
                        <span className="text-[11px] text-muted italic">Receipt #{item.invoice_ref}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

