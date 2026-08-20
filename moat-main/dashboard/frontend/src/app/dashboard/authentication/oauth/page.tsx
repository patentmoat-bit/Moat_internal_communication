"use client";

import { useState } from "react";
import { Globe, Save, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

export default function OAuthSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<"connected" | "failed" | "untested">("connected");

  const [config, setConfig] = useState({
    clientId: "b7e4a7...",
    tenantId: "8f1a...",
    clientSecret: "••••••••••••••••••••",
    redirectUri: "https://moat.ai/api/auth/callback/microsoft",
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "OAuth Config Saved",
        description: "Microsoft Entra ID integration updated successfully.",
      });
    }, 800);
  };

  const handleTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setStatus("connected");
      toast({
        title: "Connection Successful",
        description: "Successfully authenticated with Microsoft Entra ID.",
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Microsoft OAuth2 (Entra ID)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure enterprise Single Sign-On (SSO) integration.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold">
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Configuration</>}
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#c9a84c]" /> Connection Status
            </CardTitle>
            <CardDescription>Current status of the Entra ID integration.</CardDescription>
          </div>
          <div>
            {status === "connected" && (
              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-3 py-1 gap-1.5 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected &amp; Active
              </Badge>
            )}
            {status === "failed" && (
              <Badge variant="destructive" className="px-3 py-1 gap-1.5 flex items-center">
                <XCircle className="w-3.5 h-3.5" /> Connection Failed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Client ID (Application ID)</Label>
              <Input 
                value={config.clientId} 
                onChange={(e) => setConfig({...config, clientId: e.target.value})} 
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tenant ID (Directory ID)</Label>
              <Input 
                value={config.tenantId} 
                onChange={(e) => setConfig({...config, tenantId: e.target.value})} 
                placeholder="common or 00000000-0000-0000-0000-000000000000"
              />
            </div>

            <div className="space-y-2">
              <Label>Client Secret (Value)</Label>
              <Input 
                type="password"
                value={config.clientSecret} 
                onChange={(e) => setConfig({...config, clientSecret: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Redirect URI</Label>
              <Input 
                value={config.redirectUri} 
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">This URI must be registered in your Azure portal.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
