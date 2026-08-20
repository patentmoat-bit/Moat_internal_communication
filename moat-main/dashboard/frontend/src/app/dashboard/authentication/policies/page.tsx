"use client";

import { useState } from "react";
import { ShieldAlert, Save, KeyRound, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";

export default function SecurityPolicies() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [policy, setPolicy] = useState({
    minLength: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: true,
    passwordExpiryDays: "90",
    maxFailedAttempts: "5",
    accountLockoutMins: "30",
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Policies Saved",
        description: "Enterprise security policies successfully updated.",
      });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Policies</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enforce strict password requirements and login attack protections.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold">
          {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Policies</>}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-[#c9a84c]" /> Password Complexity</CardTitle>
            <CardDescription>Rules that all new or updated passwords must meet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Minimum Password Length: {policy.minLength}</Label>
              </div>
              <Slider 
                value={[policy.minLength]} 
                min={8} 
                max={32} 
                step={1}
                onValueChange={(val) => setPolicy({...policy, minLength: val[0]})}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <Label>Require Uppercase (A-Z)</Label>
                <Switch checked={policy.requireUppercase} onCheckedChange={(c) => setPolicy({...policy, requireUppercase: c})} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <Label>Require Numbers (0-9)</Label>
                <Switch checked={policy.requireNumbers} onCheckedChange={(c) => setPolicy({...policy, requireNumbers: c})} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <Label>Require Special Characters</Label>
                <Switch checked={policy.requireSpecial} onCheckedChange={(c) => setPolicy({...policy, requireSpecial: c})} />
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <Label>Password Expiry (Days)</Label>
              <Input 
                type="number" 
                value={policy.passwordExpiryDays} 
                onChange={(e) => setPolicy({...policy, passwordExpiryDays: e.target.value})} 
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">Set to 0 to disable password expiration.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[#c9a84c]" /> Brute Force Protection</CardTitle>
            <CardDescription>Lock out accounts after repeated failed login attempts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Maximum Failed Attempts</Label>
                <Input 
                  type="number" 
                  value={policy.maxFailedAttempts} 
                  onChange={(e) => setPolicy({...policy, maxFailedAttempts: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Number of failures before account lockout.</p>
              </div>

              <div className="space-y-3">
                <Label>Account Lockout Duration (Minutes)</Label>
                <Input 
                  type="number" 
                  value={policy.accountLockoutMins} 
                  onChange={(e) => setPolicy({...policy, accountLockoutMins: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Time before the user can attempt login again.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
