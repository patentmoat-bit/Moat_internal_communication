"use client";

import { useState } from "react";
import { Lock, Save, Smartphone, Mail, FileKey } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export default function MFAConfiguration() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [mfa, setMfa] = useState({
    enforceMfa: "all_users",
    allowAuthenticator: true,
    allowEmail: false,
    allowBackupCodes: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "MFA Configuration Saved",
        description: "Multi-Factor Authentication policies updated.",
      });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Multi-Factor Authentication (MFA)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Protect accounts from credential theft with secondary validation.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold">
          {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Configuration</>}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-[#c9a84c]" /> MFA Enforcement</CardTitle>
            <CardDescription>Determine who must use MFA when logging into MOAT.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Enforcement Policy</Label>
              <Select value={mfa.enforceMfa} onValueChange={(v) => setMfa({...mfa, enforceMfa: v})}>
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Select enforcement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled (Optional for all)</SelectItem>
                  <SelectItem value="admin_only">Require for Administrators only</SelectItem>
                  <SelectItem value="all_users">Require for ALL Users</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Changes will take effect upon the user's next login.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-[#c9a84c]" /> Supported Factors</CardTitle>
            <CardDescription>Select which secondary validation methods users can configure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5 flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Smartphone className="w-5 h-5" /></div>
                <div>
                  <Label className="text-base font-semibold">Authenticator App (TOTP)</Label>
                  <p className="text-sm text-muted-foreground">Google Authenticator, Microsoft Authenticator, Authy.</p>
                </div>
              </div>
              <Switch checked={mfa.allowAuthenticator} onCheckedChange={(c) => setMfa({...mfa, allowAuthenticator: c})} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5 flex items-center gap-4">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Mail className="w-5 h-5" /></div>
                <div>
                  <Label className="text-base font-semibold">Email OTP</Label>
                  <p className="text-sm text-muted-foreground">Send a one-time passcode to the user's registered email.</p>
                </div>
              </div>
              <Switch checked={mfa.allowEmail} onCheckedChange={(c) => setMfa({...mfa, allowEmail: c})} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="space-y-0.5 flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><FileKey className="w-5 h-5" /></div>
                <div>
                  <Label className="text-base font-semibold">Backup Codes</Label>
                  <p className="text-sm text-muted-foreground">Allow generation of one-time recovery codes.</p>
                </div>
              </div>
              <Switch checked={mfa.allowBackupCodes} onCheckedChange={(c) => setMfa({...mfa, allowBackupCodes: c})} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
