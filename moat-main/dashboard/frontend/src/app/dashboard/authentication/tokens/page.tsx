"use client";

import { KeyRound, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const activeTokens = [
  { id: "tk1", type: "JWT Access", user: "system_admin", issued: "10:45 AM", expires: "In 45 mins" },
  { id: "tk2", type: "Refresh Token", user: "system_admin", issued: "10:45 AM", expires: "In 7 days" },
  { id: "tk3", type: "JWT Access", user: "analyst_04", issued: "09:30 AM", expires: "Expired" },
];

export default function TokenManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Token Management</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor active JWT access tokens and persistent refresh tokens.
          </p>
        </div>
        <Button variant="destructive">
          <ShieldAlert className="w-4 h-4 mr-2" />
          Invalidate All Tokens
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-[#c9a84c]" /> Active Tokens</CardTitle>
          <CardDescription>Current unexpired cryptographic tokens securing API sessions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Token Type</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-background">{token.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{token.issued}</TableCell>
                  <TableCell>
                    <span className={token.expires === "Expired" ? "text-rose-500 font-semibold text-sm" : "text-muted-foreground text-sm"}>
                      {token.expires}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="text-xs" disabled={token.expires === "Expired"}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
