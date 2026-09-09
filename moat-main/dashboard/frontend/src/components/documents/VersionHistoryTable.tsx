import React from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function getFileExtBadge(fileName: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const colors: Record<string, string> = {
    pdf: "bg-red-100 text-red-700",
    doc: "bg-blue-100 text-blue-700",
    docx: "bg-blue-100 text-blue-700",
    png: "bg-green-100 text-green-700",
    jpg: "bg-green-100 text-green-700",
    jpeg: "bg-green-100 text-green-700",
    zip: "bg-yellow-100 text-yellow-700",
  };
  return { ext: ext.toUpperCase(), color: colors[ext] ?? "bg-gray-100 text-gray-600" };
}

export function VersionHistoryTable({ versions, onDownload }: { versions: any[], onDownload?: (version: any) => void }) {
  if (!versions || versions.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 border border-border/50 rounded bg-muted/10">No versions uploaded yet.</div>;
  }

  return (
    <div className="border border-border/60 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full min-w-[640px] text-sm text-left">
        <colgroup>
          <col style={{ width: "70px" }} />
          <col style={{ minWidth: "200px" }} />
          <col style={{ width: "120px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "130px" }} />
        </colgroup>
        <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider border-b border-border/50">
          <tr>
            <th className="px-4 py-3">Version</th>
            <th className="px-4 py-3">File Name</th>
            <th className="px-4 py-3">Uploaded Date</th>
            <th className="px-4 py-3">Notes</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {versions.map((v, i) => {
            const { ext, color } = getFileExtBadge(v.file_name || "");
            return (
              <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                {/* Version */}
                <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                  v{v.version_number || `1.${i}`}
                </td>

                {/* File Name — truncated with tooltip */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    {ext && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${color}`}>
                        {ext}
                      </span>
                    )}
                    <span
                      className="truncate text-foreground"
                      title={v.file_name}
                    >
                      {v.file_name}
                    </span>
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>

                {/* Notes */}
                <td className="px-4 py-3 text-muted-foreground">
                  {v.notes ? (
                    <span className="truncate block" title={v.notes}>{v.notes}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* Action */}
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDownload && onDownload(v); }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
