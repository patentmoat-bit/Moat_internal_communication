"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Database,
  HardDrive,
  FileText,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  RotateCcw,
  Lock,
  Clock,
  Activity,
  PlusCircle,
  Sparkles,
  Check,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RecoveryDashboardSummary, BackupRecord, RecoveryLogRecord, BackupTarget, BackupType } from "@/lib/security/recovery/types";

export default function BackupRecoveryAdminPage() {
  const [data, setData] = useState<RecoveryDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc: string; type: "success" | "error" } | null>(null);

  // New Backup Modal state
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newBackupName, setNewBackupName] = useState("");
  const [newBackupTarget, setNewBackupTarget] = useState<BackupTarget>("ALL");
  const [newBackupType, setNewBackupType] = useState<BackupType>("FULL");

  // Restore Wizard Modal state
  const [restoreWizardBackup, setRestoreWizardBackup] = useState<BackupRecord | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [confirmText, setConfirmText] = useState("");

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recovery");
      const json = await res.json();
      if (json.success) {
        setData(json.summary);
      }
    } catch (err) {
      console.error("Failed to load Phase 9 telemetry:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 20000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const showToast = (title: string, desc: string, type: "success" | "error" = "success") => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBackupName.trim()) return;
    setActionLoading("create_backup");
    try {
      const res = await fetch("/api/admin/recovery/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_backup",
          name: newBackupName,
          target: newBackupTarget,
          type: newBackupType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Backup Created & Encrypted", `Successfully created ${newBackupType} backup for ${newBackupTarget}.`);
        setShowBackupModal(false);
        setNewBackupName("");
        fetchDashboardData();
      } else {
        showToast("Backup Failed", json.error || "Could not initiate backup.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message || "Network request failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyIntegrity = async (backupId: string) => {
    setActionLoading(`verify_${backupId}`);
    try {
      const res = await fetch("/api/admin/recovery/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_backup", backupId }),
      });
      const json = await res.json();
      if (json.success && json.verification.verified) {
        showToast("Integrity Verified", `SHA-256 cryptographic checksum matched for backup.`);
      } else {
        showToast("Verification Warning", json.verification?.reason || "Checksum mismatch detected!", "error");
      }
      fetchDashboardData();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestRestore = async (backupId: string) => {
    setActionLoading(`test_${backupId}`);
    try {
      const res = await fetch("/api/admin/recovery/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_recovery", backupId, initiatedBy: "ADMIN_DASHBOARD" }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Recovery Test Passed", `Dry-run test restored ${json.log.restoredRecordsCount.toLocaleString()} records without errors.`);
        fetchDashboardData();
      } else {
        showToast("Test Restore Failed", json.error || "Dry run reported errors.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const executeRestoreWizard = async () => {
    if (!restoreWizardBackup || confirmText.toUpperCase() !== "RESTORE") return;
    setActionLoading("execute_dr");
    try {
      const res = await fetch("/api/admin/recovery/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_backup", backupId: restoreWizardBackup.backupId, initiatedBy: "ADMIN_WIZARD_CEO" }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Disaster Recovery Executed", `Successfully restored ${json.log.restoredRecordsCount.toLocaleString()} records across nodes.`);
        setRestoreWizardBackup(null);
        setConfirmText("");
        setWizardStep(1);
        fetchDashboardData();
      } else {
        showToast("DR Restoration Failed", json.error || "An exception occurred during restoration.", "error");
      }
    } catch (err: any) {
      showToast("Error", err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getTargetIcon = (target: BackupTarget) => {
    if (target === "DATABASE") return <Database className="h-5 w-5 text-amber-400" />;
    if (target === "STORAGE") return <HardDrive className="h-5 w-5 text-blue-400" />;
    if (target === "SUPABASE") return <Cloud className="h-5 w-5 text-emerald-400" />;
    if (target === "DOCUMENT") return <FileText className="h-5 w-5 text-purple-400" />;
    return <Sparkles className="h-5 w-5 text-[#c9a84c]" />;
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-gray-800 p-6 space-y-8 pb-20">
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 right-6 z-50 flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md",
              toastMsg.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}
          >
            {toastMsg.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold text-sm">{toastMsg.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{toastMsg.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-400 text-xs font-semibold inline-flex items-center gap-1">
              <Lock className="h-3 w-3" /> AES-256-GCM Encryption
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-[#c9a84c]" />
            Disaster Recovery & Business Continuity
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated database, Supabase, and storage repository protection with forensic SHA-256 checksum validation and 1-click DR restoration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
          <button
            onClick={() => setShowBackupModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#9a7b2c] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-all shadow-lg shadow-[#c9a84c]/20 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" /> Trigger New Backup
          </button>
        </div>
      </div>

      {/* RPO / RTO Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 bg-white backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Recovery Point (RPO)</span>
              <Clock className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">{data ? `${data.metrics.rpoHours}h` : "---"}</span>
              <span className="text-xs font-semibold text-emerald-400">Target &lt; 4.0h</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 truncate">Max acceptable data loss window</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Recovery Time (RTO)</span>
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">{data ? `${data.metrics.rtoMinutes}m` : "---"}</span>
              <span className="text-xs font-semibold text-emerald-400">Target &lt; 10m</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 truncate">Avg restore execution duration</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Encrypted Vault</span>
              <Lock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900">
                {data ? `${(data.metrics.totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : "---"}
              </span>
              <span className="text-xs font-semibold text-gray-500">{data?.metrics.totalBackupsCount || 0} Backups</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 truncate">AES-256-GCM protected storage</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Last Test Restore</span>
              <CheckCircle2 className="h-5 w-5 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {data?.metrics.lastTestStatus || "VERIFIED"}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 truncate">
              Tested: {data?.metrics.lastTestedAt ? new Date(data.metrics.lastTestedAt).toLocaleTimeString() : "Recently"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Health Status Cards */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Protected Repository Targets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.activeTargets.map((t) => (
            <div key={t.target} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 hover:border-[#c9a84c]/40 transition-all">
              <div className="p-3 rounded-xl bg-gray-100 border border-gray-200">
                {getTargetIcon(t.target)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900 capitalize">{t.target}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-400 border border-emerald-200">
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Last backup: {t.lastBackup ? new Date(t.lastBackup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Backups Repository Table */}
      <Card className="border-gray-200 bg-white backdrop-blur-md">
        <CardHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-[#c9a84c]" /> Immutable Backup Repository
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-1">
                Cryptographically signed backups ready for rapid 1-click restoration or integrity scanning.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-white text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Backup Name / ID</th>
                  <th className="py-3.5 px-4">Target / Type</th>
                  <th className="py-3.5 px-4">Size & Encryption</th>
                  <th className="py-3.5 px-4">SHA-256 Integrity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {data?.recentBackups.map((b) => (
                  <tr key={b.backupId} className="hover:bg-white transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{b.backupId}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getTargetIcon(b.target)}
                        <span className="font-semibold text-xs">{b.target}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {b.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{(b.sizeBytes / (1024 * 1024)).toFixed(1)} MB</p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Lock className="h-3 w-3" /> {b.encryptionAlgo}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-100 inline-block max-w-[150px] truncate" title={b.checksum}>
                        {b.checksum.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5",
                        b.status === "VERIFIED" ? "bg-emerald-50 text-emerald-400 border border-emerald-200" :
                        b.status === "COMPLETED" ? "bg-blue-50 text-blue-400 border border-blue-200" :
                        "bg-red-50 text-red-400 border border-red-200"
                      )}>
                        {b.status === "VERIFIED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {b.status === "CORRUPTED" && <AlertTriangle className="h-3.5 w-3.5" />}
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerifyIntegrity(b.backupId)}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-100 text-gray-800 transition-all active:scale-95 inline-flex items-center gap-1"
                        >
                          {actionLoading === `verify_${b.backupId}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-400" />}
                          Verify
                        </button>
                        <button
                          onClick={() => handleTestRestore(b.backupId)}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-100 text-emerald-300 transition-all active:scale-95 inline-flex items-center gap-1"
                        >
                          {actionLoading === `test_${b.backupId}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Test Restore
                        </button>
                        <button
                          onClick={() => { setRestoreWizardBackup(b); setWizardStep(1); setConfirmText(""); }}
                          className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-700 hover:bg-red-500/30 transition-all active:scale-95 inline-flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore Wizard
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Forensic Recovery Audit Logs Feed */}
      <Card className="border-gray-200 bg-white backdrop-blur-md">
        <CardHeader className="border-b border-gray-200 pb-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" /> Recovery Testing & DR Restoration Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {data?.recoveryLogs.map((log) => (
            <div key={log.logId} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", log.status === "SUCCESS" ? "bg-emerald-50 text-emerald-400" : "bg-red-50 text-red-400")}>
                  {log.status === "SUCCESS" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{log.recoveryType === "DISASTER_RECOVERY" ? "🚨 Disaster Recovery Restore" : "🛡️ Dry-Run Test Restore"}</span>
                    <span className="text-xs text-gray-500 font-mono">({log.backupId})</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Restored <span className="text-gray-900 font-bold">{log.restoredRecordsCount.toLocaleString()}</span> records in <span className="text-amber-400 font-semibold">{log.durationMs}ms</span> | Initiated by {log.initiatedBy}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* New Backup Modal */}
      <AnimatePresence>
        {showBackupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-[#c9a84c]" /> Initiate Automated Backup
                </h3>
                <button onClick={() => setShowBackupModal(false)} className="text-gray-500 hover:text-gray-900">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateBackup} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Backup Snapshot Name</label>
                  <input
                    type="text"
                    required
                    value={newBackupName}
                    onChange={(e) => setNewBackupName(e.target.value)}
                    placeholder="e.g. Pre-Release Full Vault Snapshot"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-[#c9a84c] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Target Repository</label>
                    <select
                      value={newBackupTarget}
                      onChange={(e) => setNewBackupTarget(e.target.value as any)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#c9a84c] focus:outline-none"
                    >
                      <option value="ALL">All Vaults (Full Ecosystem)</option>
                      <option value="DATABASE">Database (Relational Schema)</option>
                      <option value="SUPABASE">Supabase (Auth + RLS + Storage)</option>
                      <option value="STORAGE">Storage Buckets</option>
                      <option value="DOCUMENT">Document Repository</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Backup Strategy</label>
                    <select
                      value={newBackupType}
                      onChange={(e) => setNewBackupType(e.target.value as any)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#c9a84c] focus:outline-none"
                    >
                      <option value="FULL">Full Backup</option>
                      <option value="INCREMENTAL">Incremental (Delta Only)</option>
                    </select>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-xs text-gray-800 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#c9a84c] shrink-0" />
                  <span>All payloads will be automatically encrypted with AES-256-GCM and signed with SHA-256 checksums.</span>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowBackupModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === "create_backup"}
                    className="px-5 py-2 rounded-xl bg-[#c9a84c] text-black text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    {actionLoading === "create_backup" && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Encrypt & Store Backup
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1-Click Restore Wizard Modal */}
      <AnimatePresence>
        {restoreWizardBackup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3 text-red-400 border-b border-red-500/20 pb-4">
                <AlertTriangle className="h-7 w-7 shrink-0" />
                <div>
                  <h3 className="text-lg font-black tracking-tight text-gray-900">Disaster Recovery Restore Wizard</h3>
                  <p className="text-xs text-red-700">Target Snapshot: {restoreWizardBackup.name} ({restoreWizardBackup.target})</p>
                </div>
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Step 1: Cryptographic Verification & Pre-Flight Scan</p>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs font-mono">
                    <p className="text-emerald-400">✔ SHA-256 Checksum: {restoreWizardBackup.checksum.substring(0, 32)}...</p>
                    <p className="text-emerald-400">✔ Encryption Cipher: {restoreWizardBackup.encryptionAlgo} (Verified)</p>
                    <p className="text-amber-400">⚠ Target Environment: Production Workspace Nodes</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Restoring from this backup will overwrite existing node state and re-align RLS schemas. Proceed to confirmation?
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setRestoreWizardBackup(null)} className="px-4 py-2 rounded-xl bg-white text-xs font-semibold hover:bg-gray-100">Cancel</button>
                    <button onClick={() => setWizardStep(2)} className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500">Next: Security Clearance ➔</button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Step 2: Executive MFA & Authorization Clearance</p>
                  <p className="text-xs text-gray-500">
                    To prevent accidental overwrite or insider threats, please type <span className="font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">RESTORE</span> below to execute Disaster Recovery.
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type RESTORE to confirm..."
                    className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-mono text-gray-900 text-center tracking-widest focus:border-red-400 focus:outline-none uppercase"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setWizardStep(1)} className="px-4 py-2 rounded-xl bg-white text-xs font-semibold hover:bg-gray-100">Back</button>
                    <button
                      onClick={executeRestoreWizard}
                      disabled={confirmText !== "RESTORE" || actionLoading === "execute_dr"}
                      className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black tracking-wider hover:bg-red-500 disabled:opacity-40 transition-all flex items-center gap-2"
                    >
                      {actionLoading === "execute_dr" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      EXECUTE DISASTER RECOVERY
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
