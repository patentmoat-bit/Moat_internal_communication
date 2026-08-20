"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Lock,
  Ban,
  Mail,
  Activity,
  Key,
  Bot,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Globe,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Layers,
  Settings,
  Save,
  Sliders,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SecurityMetrics {
  failedLoginsToday: number;
  lockedAccounts: number;
  blockedIps: number;
  passwordResetRequests: number;
  rateLimitedRequests: number;
  mfaFailures: number;
  captchaChallenges: number;
}

interface SecurityLogRecord {
  id: string;
  timestamp: string;
  userId: string | null;
  email: string | null;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  status: "SUCCESS" | "FAILURE" | "WARNING" | "INFO";
  failureReason: string | null;
  location: string;
  metadata?: Record<string, any>;
}

interface SecurityConfig {
  LOGIN_RATE_LIMIT: number;
  LOGIN_MAX_FAILURES: number;
  ACCOUNT_LOCK_DURATION_MS: number;
  PASSWORD_RESET_LIMIT: number;
  PASSWORD_RESET_IP_LIMIT: number;
  MFA_MAX_FAILURES: number;
  MFA_LOCK_DURATION_MS: number;
  CAPTCHA_AFTER_FAILURES: number;
}

export default function SecurityDashboardPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    failedLoginsToday: 0,
    lockedAccounts: 0,
    blockedIps: 0,
    passwordResetRequests: 0,
    rateLimitedRequests: 0,
    mfaFailures: 0,
    captchaChallenges: 0,
  });
  const [logs, setLogs] = useState<SecurityLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Config State
  const [config, setConfig] = useState<SecurityConfig>({
    LOGIN_RATE_LIMIT: 10,
    LOGIN_MAX_FAILURES: 5,
    ACCOUNT_LOCK_DURATION_MS: 900000,
    PASSWORD_RESET_LIMIT: 3,
    PASSWORD_RESET_IP_LIMIT: 10,
    MFA_MAX_FAILURES: 5,
    MFA_LOCK_DURATION_MS: 900000,
    CAPTCHA_AFTER_FAILURES: 3,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"telemetry" | "config">("telemetry");

  // Filters
  const [filterUser, setFilterUser] = useState("");
  const [filterIp, setFilterIp] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterEvent, setFilterEvent] = useState("");

  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterUser) params.set("user", filterUser);
      if (filterIp) params.set("ip", filterIp);
      if (filterDate) params.set("date", filterDate);
      if (filterEvent) params.set("event", filterEvent);

      const [metricsRes, configRes] = await Promise.all([
        fetch(`/api/admin/security/metrics?${params.toString()}`),
        fetch(`/api/admin/security/config`),
      ]);
      const metricsData = await metricsRes.json();
      const configData = await configRes.json();

      if (metricsData.success) {
        setMetrics(metricsData.metrics);
        setLogs(metricsData.logs || []);
      }
      if (configData.success && configData.config) {
        setConfig(configData.config);
      }
    } catch (err) {
      console.error("Failed to load security telemetry:", err);
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterIp, filterDate, filterEvent]);

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 15000);
    return () => clearInterval(interval);
  }, [fetchSecurityData]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigSavedMsg("");
    try {
      const res = await fetch(`/api/admin/security/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSavedMsg("Security thresholds updated and active across all nodes!");
        setTimeout(() => setConfigSavedMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSavingConfig(false);
    }
  };

  const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    LOGIN_SUCCESS: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
    LOGIN_FAILED: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
    ACCOUNT_LOCKED: { bg: "bg-red-600/20", text: "text-red-600 font-bold", border: "border-red-600/50" },
    MFA_LOCKED: { bg: "bg-red-600/20", text: "text-red-600 font-bold", border: "border-red-600/50" },
    RATE_LIMIT_EXCEEDED: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
    PASSWORD_RESET_RATE_LIMIT: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
    IP_BLOCKED: { bg: "bg-rose-500/10", text: "text-rose-500 font-bold", border: "border-rose-500/40" },
    MFA_VERIFIED: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/30" },
    MFA_FAILED: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30" },
    PASSWORD_RESET_REQUESTED: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
    CAPTCHA_REQUIRED: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30" },
    CAPTCHA_FAILED: { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/30" },
  };

  const EVENT_TYPES = [
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "ACCOUNT_LOCKED",
    "RATE_LIMIT_EXCEEDED",
    "PASSWORD_RESET_REQUESTED",
    "PASSWORD_RESET_RATE_LIMIT",
    "MFA_VERIFIED",
    "MFA_FAILED",
    "MFA_LOCKED",
    "CAPTCHA_REQUIRED",
    "CAPTCHA_FAILED",
    "IP_BLOCKED",
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header with Glassmorphism Gold Banner */}
      <div className="pt-6">
        <div className="relative overflow-hidden rounded-2xl border border-[#c9a84c]/30 bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-[#18181b] dark:via-[#272215] dark:to-[#18181b] p-6 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#c9a84c]/20 dark:bg-[#c9a84c]/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#c9a84c] font-bold px-3 py-1">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 inline" /> Enterprise Stack Active
                </Badge>
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  <Database className="w-3 h-3 mr-1 inline" /> SecurityEvents & Users Table Extended
                </Badge>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                Admin Security Operations & Telemetry
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                Real-time monitoring of authentication defense layers (Rate limiting, MFA lockout, CAPTCHA challenges) with configurable dynamic thresholds.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl bg-muted/60 dark:bg-black/40 p-1 border border-[#c9a84c]/20">
                <button
                  onClick={() => setActiveTab("telemetry")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                    activeTab === "telemetry" ? "bg-[#c9a84c] text-white dark:text-black shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Activity className="h-3.5 w-3.5" /> Live Telemetry
                </button>
                <button
                  onClick={() => setActiveTab("config")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                    activeTab === "config" ? "bg-[#c9a84c] text-white dark:text-black shadow" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sliders className="h-3.5 w-3.5" /> Security Thresholds
                </button>
              </div>
              <button
                onClick={fetchSecurityData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-2 text-sm font-semibold text-[#c9a84c] hover:bg-[#c9a84c]/20 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "config" ? (
        /* Security Thresholds Configuration Panel */
        <Card className="border-[#c9a84c]/40 bg-card/80 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-border/50 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-[#c9a84c]" /> Dynamic Security Policy Thresholds
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Adjust enterprise authentication limits in real time. Changes take effect instantly across rate limiters, lockout counters, and CAPTCHA engines.
                </CardDescription>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e5c567] px-5 py-2.5 text-sm font-bold text-black shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {savingConfig ? "Saving Policy..." : "Save Policy Changes"}
              </button>
            </div>
            {configSavedMsg && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {configSavedMsg}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setting 1: Login Rate Limit */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">LOGIN_RATE_LIMIT</label>
                <Badge className="bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/40 font-mono text-xs">
                  {config.LOGIN_RATE_LIMIT} req / 5 min
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Maximum login attempts allowed per client IP address within a 5-minute window.</p>
              <input
                type="number"
                min={1}
                max={100}
                value={config.LOGIN_RATE_LIMIT}
                onChange={(e) => setConfig({ ...config, LOGIN_RATE_LIMIT: parseInt(e.target.value || "10", 10) })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
              />
            </div>

            {/* Setting 2: Login Max Failures */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">LOGIN_MAX_FAILURES</label>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 font-mono text-xs">
                  {config.LOGIN_MAX_FAILURES} failed attempts
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Consecutive failed login attempts before locking account (`failed_login_attempts`).</p>
              <input
                type="number"
                min={1}
                max={20}
                value={config.LOGIN_MAX_FAILURES}
                onChange={(e) => setConfig({ ...config, LOGIN_MAX_FAILURES: parseInt(e.target.value || "5", 10) })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
              />
            </div>

            {/* Setting 3: Account Lock Duration */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">ACCOUNT_LOCK_DURATION</label>
                <Badge className="bg-red-600/20 text-red-400 border-red-600/40 font-mono text-xs">
                  {Math.round(config.ACCOUNT_LOCK_DURATION_MS / 60000)} minutes
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Duration of temporary account lockout (`locked_until`) after exceeding failure threshold.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={Math.round(config.ACCOUNT_LOCK_DURATION_MS / 60000)}
                  onChange={(e) => setConfig({ ...config, ACCOUNT_LOCK_DURATION_MS: parseInt(e.target.value || "15", 10) * 60000 })}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">mins</span>
              </div>
            </div>

            {/* Setting 4: Password Reset Limit */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">PASSWORD_RESET_LIMIT</label>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 font-mono text-xs">
                  {config.PASSWORD_RESET_LIMIT} per hour
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Maximum password reset email requests per user email per hour (`failed_reset_requests`).</p>
              <input
                type="number"
                min={1}
                max={50}
                value={config.PASSWORD_RESET_LIMIT}
                onChange={(e) => setConfig({ ...config, PASSWORD_RESET_LIMIT: parseInt(e.target.value || "3", 10) })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
              />
            </div>

            {/* Setting 5: Password Reset IP Limit */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">PASSWORD_RESET_IP_LIMIT</label>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 font-mono text-xs">
                  {config.PASSWORD_RESET_IP_LIMIT} per hour
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Maximum password reset attempts allowed from a single client IP address per hour.</p>
              <input
                type="number"
                min={1}
                max={100}
                value={config.PASSWORD_RESET_IP_LIMIT}
                onChange={(e) => setConfig({ ...config, PASSWORD_RESET_IP_LIMIT: parseInt(e.target.value || "10", 10) })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
              />
            </div>

            {/* Setting 6: MFA Max Failures */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">MFA_MAX_FAILURES</label>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 font-mono text-xs">
                  {config.MFA_MAX_FAILURES} failed attempts
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Maximum failed TOTP verification attempts allowed (`failed_mfa_attempts`).</p>
              <input
                type="number"
                min={1}
                max={20}
                value={config.MFA_MAX_FAILURES}
                onChange={(e) => setConfig({ ...config, MFA_MAX_FAILURES: parseInt(e.target.value || "5", 10) })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
              />
            </div>

            {/* Setting 7: MFA Lock Duration */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">MFA_LOCK_DURATION</label>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 font-mono text-xs">
                  {Math.round(config.MFA_LOCK_DURATION_MS / 60000)} minutes
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Duration of temporary MFA endpoint lockout after exceeding attempts.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={Math.round(config.MFA_LOCK_DURATION_MS / 60000)}
                  onChange={(e) => setConfig({ ...config, MFA_LOCK_DURATION_MS: parseInt(e.target.value || "15", 10) * 60000 })}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">mins</span>
              </div>
            </div>

            {/* Setting 8: CAPTCHA After Failures */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">CAPTCHA_AFTER_FAILURES</label>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40 font-mono text-xs">
                  after {config.CAPTCHA_AFTER_FAILURES} failures
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Number of failed logins before enforcing Cloudflare Turnstile / reCAPTCHA challenge.</p>
              <input
                type="number"
                min={1}
                max={10}
                value={config.CAPTCHA_AFTER_FAILURES}
                onChange={(e) => setConfig({ ...config, CAPTCHA_AFTER_FAILURES: parseInt(e.target.value || "3", 10) })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono focus:outline-none focus:border-[#c9a84c]"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 7 Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Failed Logins Today */}
            <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent shadow-lg hover:shadow-red-500/10 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Failed Logins Today
                </CardTitle>
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-red-500">{metrics.failedLoginsToday}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Layer 2 / Layer 3 progressive delays applied</p>
              </CardContent>
            </Card>

            {/* Card 2: Locked Accounts */}
            <Card className="border-red-600/40 bg-gradient-to-br from-red-600/10 to-transparent shadow-lg hover:shadow-red-600/15 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Locked Accounts
                </CardTitle>
                <div className="p-2 rounded-lg bg-red-600/10 text-red-600">
                  <Lock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-red-600">{metrics.lockedAccounts}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {Math.round(config.ACCOUNT_LOCK_DURATION_MS / 60000)}m lockouts enforced (Layer 2 & 6)
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Blocked IPs */}
            <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent shadow-lg hover:shadow-rose-500/10 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Blocked IPs
                </CardTitle>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                  <Ban className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-rose-500">{metrics.blockedIps}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Layer 1 Per-IP & Reputation filtering</p>
              </CardContent>
            </Card>

            {/* Card 4: Password Reset Requests */}
            <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent shadow-lg hover:shadow-blue-500/10 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password Reset Requests
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Mail className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-blue-500">{metrics.passwordResetRequests}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Max {config.PASSWORD_RESET_LIMIT}/hr per account (Layer 5)</p>
              </CardContent>
            </Card>

            {/* Card 5: Rate Limited Requests */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent shadow-lg hover:shadow-amber-500/10 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rate Limited Requests
                </CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-amber-500">{metrics.rateLimitedRequests}</div>
                <p className="text-[11px] text-muted-foreground mt-1">HTTP 429 triggered across endpoints</p>
              </CardContent>
            </Card>

            {/* Card 6: MFA Failures */}
            <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent shadow-lg hover:shadow-orange-500/10 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  MFA Failures
                </CardTitle>
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Key className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-orange-500">{metrics.mfaFailures}</div>
                <p className="text-[11px] text-muted-foreground mt-1">TOTP verification failed (Layer 6)</p>
              </CardContent>
            </Card>

            {/* Card 7: CAPTCHA Challenges */}
            <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent shadow-lg hover:shadow-purple-500/10 transition-all sm:col-span-2 lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CAPTCHA Challenges
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Bot className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-purple-500">{metrics.captchaChallenges}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Triggered after {config.CAPTCHA_AFTER_FAILURES} failures or low IP score (Layer 4)
                  </p>
                </div>
                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-3 py-1 text-xs">
                  Turnstile / reCAPTCHA / hCaptcha Ready
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Filtering Bar */}
          <Card className="border-border/80 bg-card/60 backdrop-blur-md shadow-md">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#c9a84c]" /> Filter SecurityEvents Table
              </CardTitle>
              <CardDescription className="text-xs">
                Filter high-precision security telemetry by User, IP Address, Timestamp, or specific Security Event type.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* User Filter */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by User (Email/ID)..."
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-[#c9a84c] transition-all"
                  />
                </div>

                {/* IP Filter */}
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by IP Address..."
                    value={filterIp}
                    onChange={(e) => setFilterIp(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-[#c9a84c] transition-all"
                  />
                </div>

                {/* Date Filter */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-[#c9a84c] transition-all"
                  />
                </div>

                {/* Event Type Filter */}
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterEvent}
                    onChange={(e) => setFilterEvent(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-[#c9a84c] transition-all font-medium"
                  >
                    <option value="">All Security Events</option>
                    {EVENT_TYPES.map((ev) => (
                      <option key={ev} value={ev}>
                        {ev.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(filterUser || filterIp || filterDate || filterEvent) && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => { setFilterUser(""); setFilterIp(""); setFilterDate(""); setFilterEvent(""); }}
                    className="text-xs font-semibold text-[#c9a84c] hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Immutable Audit Log Table */}
          <Card className="border-border/80 overflow-hidden shadow-xl">
            <CardHeader className="bg-muted/30 border-b border-border/60 flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#c9a84c]" /> Immutable Audit Trail Stream
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Layer 7 immutable cryptographic logging pipeline recorded to SecurityEvents and audit_logs tables.
                </CardDescription>
              </div>
              <Badge className="bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 font-mono text-xs">
                {logs.length} Log Entries
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 animate-spin text-[#c9a84c] mb-3" />
                  <p className="text-sm font-medium">Fetching real-time security logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ShieldAlert className="h-10 w-10 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">No audit logs matching your current filter criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/20 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
                        <th className="px-4 py-3 whitespace-nowrap">Event Type</th>
                        <th className="px-4 py-3 whitespace-nowrap">User / Identity</th>
                        <th className="px-4 py-3 whitespace-nowrap">IP & Location</th>
                        <th className="px-4 py-3 whitespace-nowrap">Endpoint</th>
                        <th className="px-4 py-3 whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 whitespace-nowrap">Failure Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 font-mono text-xs">
                      {logs.map((log) => {
                        const style = EVENT_COLORS[log.eventType] || { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" };
                        return (
                          <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground flex items-center gap-1.5 font-sans">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/60 inline" />
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <Badge variant="outline" className={cn("text-[11px] font-bold tracking-wide", style.bg, style.text, style.border)}>
                                {log.eventType.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap font-sans">
                              <div className="font-semibold text-foreground">{log.email || log.userId || "Anonymous"}</div>
                              <div className="text-[10px] text-muted-foreground">{log.userId ? `ID: ${log.userId}` : "Unauthenticated Client"}</div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="font-semibold text-foreground">{log.ipAddress}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-sans">
                                <Globe className="w-3 h-3 inline" /> {log.location || "Unknown"}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                              <span className="px-2 py-0.5 rounded bg-muted/40 font-mono text-[11px] border border-border/40">
                                {log.endpoint}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap font-sans">
                              {log.status === "SUCCESS" && (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> SUCCESS
                                </span>
                              )}
                              {log.status === "FAILURE" && (
                                <span className="inline-flex items-center gap-1 text-red-500 font-bold text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5" /> FAILURE
                                </span>
                              )}
                              {log.status === "WARNING" && (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5" /> WARNING
                                </span>
                              )}
                              {log.status === "INFO" && (
                                <span className="inline-flex items-center gap-1 text-blue-400 font-bold text-xs">
                                  <Server className="w-3.5 h-3.5" /> INFO
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-sans text-muted-foreground max-w-xs truncate">
                              {log.failureReason || <span className="text-muted-foreground/30">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
