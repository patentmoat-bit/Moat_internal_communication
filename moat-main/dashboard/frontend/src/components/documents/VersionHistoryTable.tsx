import React from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VersionHistoryTable({ versions, onDownload }: { versions: any[], onDownload?: (version: any) => void }) {
  if (!versions || versions.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 border border-border/50 rounded bg-muted/10">No versions uploaded yet.</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border/50">
          <tr>
            <th className="px-4 py-3">Version</th>
            <th className="px-4 py-3">File Name</th>
            <th className="px-4 py-3">Uploaded Date</th>
            <th className="px-4 py-3">Notes</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v, i) => (
            <tr key={v.id} className="border-t border-border/50 hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">v{v.version_number || `1.${i}`}</td>
              <td className="px-4 py-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                {v.file_name}
              </td>
              <td className="px-4 py-3">{new Date(v.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 truncate max-w-[200px]">{v.notes || "-"}</td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" asChild onClick={() => onDownload && onDownload(v)}>
                  <a href={v.file_url} target="_blank" rel="noreferrer" download>
                    <Download className="w-4 h-4 mr-2" /> Download
                  </a>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
