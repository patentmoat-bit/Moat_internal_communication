"use client";

import { FileText, Download, Activity, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reports = [
  { title: "Login Activity Report", desc: "Detailed breakdown of all logins and logouts over a specific period." },
  { title: "Failed Login & Lockout Report", desc: "Security-focused report identifying brute force attempts and locked accounts." },
  { title: "Role Assignment Audit", desc: "Current snapshot of all users and their assigned RBAC permissions." },
  { title: "MFA Compliance Report", desc: "Identify users who have bypassed or failed to configure MFA." },
];

export default function SecurityReports() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Authentication Reports</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate and export security compliance reports for audit purposes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, idx) => (
          <Card key={idx} className="border-border shadow-sm hover:border-[#c9a84c]/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-[#c9a84c]" /> {report.title}
              </CardTitle>
              <CardDescription>{report.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" className="w-full text-xs">
                  <Download className="w-3.5 h-3.5 mr-2" /> PDF
                </Button>
                <Button variant="outline" className="w-full text-xs">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
