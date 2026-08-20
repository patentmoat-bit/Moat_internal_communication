"use client";

import { Mail, Server, Shield, Send, Loader2, Users } from "lucide-react";
import { useState, useEffect } from "react";

export default function EmailConfigurationPage() {
  const [provider, setProvider] = useState("Microsoft Graph (Office 365)");
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [fromName, setFromName] = useState("MOAT Alerts");
  const [fromEmail, setFromEmail] = useState("info@rezilyens.com");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");

  useEffect(() => {
    fetch("/api/settings/email")
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setProvider(res.data.provider || "Microsoft Graph (Office 365)");
          setTenantId(res.data.tenantId || "");
          setClientId(res.data.clientId || "");
          setClientSecret(res.data.clientSecret || "");
          setFromName(res.data.fromName || "MOAT Alerts");
          setFromEmail(res.data.fromEmail || "info@rezilyens.com");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, tenantId, clientId, clientSecret, fromName, fromEmail })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ type: 'success', text: "Email configuration saved successfully." });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!toEmails.trim()) {
      setMessage({ type: 'error', text: "Please enter at least one TO recipient email address." });
      return;
    }
    const toList = toEmails.split(",").map(e => e.trim()).filter(Boolean);
    const ccList = ccEmails.split(",").map(e => e.trim()).filter(Boolean);
    if (toList.length === 0) {
      setMessage({ type: 'error', text: "Please enter at least one valid TO recipient." });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, tenantId, clientId, clientSecret, fromName, fromEmail, toEmails: toList, ccEmails: ccList })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ type: 'success', text: data.message || "Test email sent successfully." });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || "Failed to send test email." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Email Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure SMTP settings for system-wide email delivery.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={handleTest}
            disabled={testing || saving}
            className="bg-background border border-border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send Test Email
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || testing}
            className="bg-[#c9a84c] hover:bg-[#b8921e] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-[#c9a84c]/20 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Settings
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-foreground">OAuth2 Provider Details</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Email Provider</label>
              <select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50">
                <option value="Microsoft Graph (Office 365)">Microsoft Graph (Office 365)</option>
                <option value="Google Workspace (Gmail API)">Google Workspace (Gmail API)</option>
                <option value="AWS SES API v2">AWS SES API v2</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tenant ID / Domain (Optional)</label>
              <input 
                type="text" 
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. 1234abcd-12ab-34cd-56ef-1234567890ab" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-foreground">OAuth2 Credentials</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Client ID</label>
              <input 
                type="text" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter OAuth2 Client ID" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Client Secret</label>
              <input 
                type="password" 
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••••••••••" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-foreground">Sender Identity</h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From Name</label>
              <input 
                type="text" 
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="MOAT Alerts" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From Email Address</label>
              <input 
                type="email" 
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="info@rezilyens.com" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-foreground">Test Email Recipients</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enter comma-separated email addresses for TO and CC recipients.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c9a84c]">TO Recipients</label>
              <input 
                type="text" 
                value={toEmails}
                onChange={(e) => setToEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
              <p className="text-xs text-muted-foreground">Primary recipients of the test email.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c9a84c]">CC Recipients</label>
              <input 
                type="text" 
                value={ccEmails}
                onChange={(e) => setCcEmails(e.target.value)}
                placeholder="manager@example.com, team@example.com" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
              />
              <p className="text-xs text-muted-foreground">Carbon copy recipients (optional).</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
