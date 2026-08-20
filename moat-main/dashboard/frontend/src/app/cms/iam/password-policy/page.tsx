"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Shield, Save, Check } from "lucide-react";

export default function PasswordPolicyPage() {
  const [policy, setPolicy] = useState({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    preventLastN: 5,
    expiryDays: 90,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Call PasswordPolicyService.updatePolicy
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fieldClass = "flex items-center justify-between p-3 rounded-lg bg-muted border border-border";

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#c9a84c]" />
          Password Policy Configuration
        </h2>
        <p className="text-muted-foreground mt-2">
          Enforce enterprise-grade password requirements across all MOAT users.
        </p>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Complexity Requirements</CardTitle>
          <CardDescription className="text-muted-foreground">Define the structural requirements for new passwords.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={fieldClass}>
            <div>
              <p className="text-sm font-medium text-foreground">Minimum Length</p>
              <p className="text-xs text-muted-foreground">Recommended: 12+</p>
            </div>
            <input 
              type="number" 
              value={policy.minLength} 
              onChange={e => setPolicy({...policy, minLength: Number(e.target.value)})}
              className="w-20 bg-background border border-input rounded p-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]" 
            />
          </div>
          
          {[
            { label: 'Require Uppercase Letters', key: 'requireUppercase' },
            { label: 'Require Lowercase Letters', key: 'requireLowercase' },
            { label: 'Require Numbers', key: 'requireNumbers' },
            { label: 'Require Special Characters', key: 'requireSymbols' },
          ].map((item, idx) => (
            <div key={idx} className={fieldClass}>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <input 
                type="checkbox" 
                checked={(policy as any)[item.key]} 
                onChange={e => setPolicy({...policy, [item.key]: e.target.checked})}
                className="w-4 h-4 accent-[#c9a84c]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Lifecycle & Lockout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={fieldClass}>
            <div>
              <p className="text-sm font-medium text-foreground">Prevent reuse of last N passwords</p>
              <p className="text-xs text-muted-foreground">Stores salted hashes securely.</p>
            </div>
            <input 
              type="number" 
              value={policy.preventLastN} 
              onChange={e => setPolicy({...policy, preventLastN: Number(e.target.value)})}
              className="w-20 bg-background border border-input rounded p-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]" 
            />
          </div>

          <div className={fieldClass}>
            <div>
              <p className="text-sm font-medium text-foreground">Password Expiry (Days)</p>
              <p className="text-xs text-muted-foreground">Forces change after this period (0 to disable).</p>
            </div>
            <input 
              type="number" 
              value={policy.expiryDays} 
              onChange={e => setPolicy({...policy, expiryDays: Number(e.target.value)})}
              className="w-20 bg-background border border-input rounded p-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]" 
            />
          </div>

          <div className={fieldClass}>
            <div>
              <p className="text-sm font-medium text-foreground">Max Failed Login Attempts</p>
              <p className="text-xs text-muted-foreground">Before temporary lockout.</p>
            </div>
            <input 
              type="number" 
              value={policy.maxFailedAttempts} 
              onChange={e => setPolicy({...policy, maxFailedAttempts: Number(e.target.value)})}
              className="w-20 bg-background border border-input rounded p-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]" 
            />
          </div>

          <div className={fieldClass}>
            <div>
              <p className="text-sm font-medium text-foreground">Lockout Duration (Minutes)</p>
            </div>
            <input 
              type="number" 
              value={policy.lockoutDurationMinutes} 
              onChange={e => setPolicy({...policy, lockoutDurationMinutes: Number(e.target.value)})}
              className="w-20 bg-background border border-input rounded p-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-[#c9a84c]" 
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-4 border-t border-border">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#c9a84c] text-primary-foreground font-bold px-4 py-2 rounded-lg hover:bg-[#b8921e] transition-colors shadow-md shadow-[#c9a84c]/20"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save Policy"}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
