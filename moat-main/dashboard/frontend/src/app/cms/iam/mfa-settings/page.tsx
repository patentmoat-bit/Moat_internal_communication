"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Smartphone, Mail, Key, Save, Check } from "lucide-react";

export default function MFASettingsPage() {
  const [settings, setSettings] = useState({
    allowTotp: true,
    allowEmail: false,
    requireAdmin: true,
    requireCeo: true,
    requireAll: false,
    rememberDeviceDays: 30
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fieldClass = "flex items-center justify-between p-3 rounded-lg bg-muted border border-border";

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-[#c9a84c]" />
          Multi-Factor Authentication (MFA)
        </h2>
        <p className="text-muted-foreground mt-2">
          Configure organization-wide MFA requirements and supported methods.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground">Enforcement Policies</CardTitle>
            <CardDescription className="text-muted-foreground">Select which roles are mandated to use MFA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={fieldClass}>
              <div>
                <p className="text-sm font-medium text-foreground">Enforce for all Administrators</p>
                <p className="text-xs text-muted-foreground">System Admin, Super Admin, Admin</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.requireAdmin} 
                onChange={e => setSettings({...settings, requireAdmin: e.target.checked})}
                className="w-4 h-4 accent-[#c9a84c]"
              />
            </div>
            <div className={fieldClass}>
              <div>
                <p className="text-sm font-medium text-foreground">Enforce for Executives</p>
                <p className="text-xs text-muted-foreground">CEO, CTO, CIO, Chief IP Officer</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.requireCeo} 
                onChange={e => setSettings({...settings, requireCeo: e.target.checked})}
                className="w-4 h-4 accent-[#c9a84c]"
              />
            </div>
            <div className={fieldClass}>
              <div>
                <p className="text-sm font-medium text-foreground">Enforce for ALL Users</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500/80">Overrides role-based settings.</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.requireAll} 
                onChange={e => setSettings({...settings, requireAll: e.target.checked})}
                className="w-4 h-4 accent-[#c9a84c]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Allowed Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={fieldClass}>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Authenticator App (TOTP)</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.allowTotp} 
                onChange={e => setSettings({...settings, allowTotp: e.target.checked})}
                className="w-4 h-4 accent-[#c9a84c]"
              />
            </div>
            <div className={fieldClass}>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Email OTP</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.allowEmail} 
                onChange={e => setSettings({...settings, allowEmail: e.target.checked})}
                className="w-4 h-4 accent-[#c9a84c]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Device Trust</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={fieldClass}>
              <div>
                <p className="text-sm font-medium text-foreground">"Remember Me" duration</p>
                <p className="text-xs text-muted-foreground">Days to skip MFA on trusted devices.</p>
              </div>
              <input 
                type="number" 
                value={settings.rememberDeviceDays} 
                onChange={e => setSettings({...settings, rememberDeviceDays: Number(e.target.value)})}
                className="w-20 bg-background border border-input rounded p-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#c9a84c] text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-[#b8921e] transition-colors shadow-md shadow-[#c9a84c]/20"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved Configuration!" : "Save MFA Settings"}
        </button>
      </div>
    </div>
  );
}
