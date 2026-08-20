"use client";

import { useState } from "react";
import { Settings, Save, ShieldAlert, Mail, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export default function LoginSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState({
    enableEmailPassword: true,
    enableOAuth: true,
    requireVerifiedEmail: true,
    forcePasswordReset: false,
    sessionTimeout: "1440", // 24 hours in mins
    rememberMeDuration: "30", // 30 days
  });

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call to POST /api/settings/iam
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: "Login authentication configurations updated successfully.",
      });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Login Settings</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure allowed authentication methods and session lifecycle rules.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold">
          {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Configuration</>}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-[#c9a84c]" /> Authentication Methods</CardTitle>
            <CardDescription>Enable or disable login vectors for the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Email &amp; Password</Label>
                <p className="text-sm text-muted-foreground">Standard username/password authentication.</p>
              </div>
              <Switch checked={settings.enableEmailPassword} onCheckedChange={(c) => setSettings({...settings, enableEmailPassword: c})} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Microsoft OAuth2 (Entra ID)</Label>
                <p className="text-sm text-muted-foreground">Allow users to sign in with their corporate Microsoft accounts.</p>
              </div>
              <Switch checked={settings.enableOAuth} onCheckedChange={(c) => setSettings({...settings, enableOAuth: c})} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-[#c9a84c]" /> Account Verification</CardTitle>
            <CardDescription>Policies for new account activation and password resets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Require Verified Email</Label>
                <p className="text-sm text-muted-foreground">Users must verify their email address before first login.</p>
              </div>
              <Switch checked={settings.requireVerifiedEmail} onCheckedChange={(c) => setSettings({...settings, requireVerifiedEmail: c})} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-rose-500">Force Password Reset</Label>
                <p className="text-sm text-rose-500/80">Force all users to reset their passwords on next login.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => toast({ title: "Action Triggered", description: "All users flagged for password reset." })}>Trigger Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-[#c9a84c]" /> Session Lifecycle</CardTitle>
            <CardDescription>Configure how long authenticated sessions remain active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Absolute Session Timeout</Label>
                <Select value={settings.sessionTimeout} onValueChange={(v) => setSettings({...settings, sessionTimeout: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 Hour</SelectItem>
                    <SelectItem value="480">8 Hours</SelectItem>
                    <SelectItem value="1440">24 Hours</SelectItem>
                    <SelectItem value="10080">7 Days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Maximum time before requiring re-authentication.</p>
              </div>

              <div className="space-y-2">
                <Label>Remember Me Duration (Days)</Label>
                <Input 
                  type="number" 
                  value={settings.rememberMeDuration} 
                  onChange={(e) => setSettings({...settings, rememberMeDuration: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Duration of persistent login cookies.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
