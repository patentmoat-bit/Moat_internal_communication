"use client";

import { useState } from "react";
import { Bookmark, LayoutGrid, LayoutList, Trash2, FolderPlus, Briefcase, FileSpreadsheet, Filter, X, Eye } from "lucide-react";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PatentDetailPanel } from "@/components/search/PatentDetailPanel";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function SavedPatentsPage() {
  const { removePatent, addToCollection, addWorkspacePatent, savedPatents, collections, workspaces } = useApp();

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePatent, setActivePatent] = useState<any | null>(null);

  // Filter States
  const [filterIpc, setFilterIpc] = useState("ALL");
  const [filterCollection, setFilterCollection] = useState("ALL");

  // Options dropdown menus for bulk action
  const [showColMenu, setShowColMenu] = useState(false);
  const [showWsMenu, setShowWsMenu] = useState(false);

  // Unique IPC codes in saved list
  const allIpcCodes = Array.from(new Set(savedPatents.flatMap((p) => p.ipc || [])));

  // Filter patents
  const filteredPatents = savedPatents.filter((p) => {
    const matchesIpc = filterIpc === "ALL" || (p.ipc || []).includes(filterIpc);
    const matchesCol = filterCollection === "ALL" || collections.find((c) => c.id === filterCollection)?.patents.some((colPat) => colPat.id === p.id);
    return matchesIpc && matchesCol;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPatents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPatents.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Remove ${selectedIds.length} patents from saved list?`)) {
      selectedIds.forEach((id) => removePatent(id));
      setSelectedIds([]);
    }
  };

  const handleBulkAddToCollection = (colId: string) => {
    selectedIds.forEach((id) => {
      const pat = savedPatents.find((p) => p.id === id);
      if (pat) addToCollection(colId, pat);
    });
    setSelectedIds([]);
    setShowColMenu(false);
  };

  const handleBulkAddToWorkspace = (wsId: string) => {
    selectedIds.forEach((id) => {
      const pat = savedPatents.find((p) => p.id === id);
      if (pat) addWorkspacePatent(wsId, pat);
    });
    setSelectedIds([]);
    setShowWsMenu(false);
  };

  const handleExportCSV = () => {
    const patentsToExport = savedPatents.filter((p) => selectedIds.includes(p.id));
    if (patentsToExport.length === 0) return;

    const headers = ["Patent Number", "Title", "Assignee", "Filing Date", "IPC Codes"];
    const rows = patentsToExport.map((p) => [
      p.patentNumber,
      `"${p.title.replace(/"/g, '""')}"`,
      p.assignee,
      p.date,
      (p.ipc || []).join(";")
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "saved_patents.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary" />
          Saved Patents
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review, categorize, export, or perform side-by-side claim analysis on your bookmarks.
        </p>
      </div>

      <Separator />

      {/* Main Layout: Filters sidebar + list */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Filters Panel (1/4 width) */}
        <Card className="md:col-span-1 border-border/60 self-start">
          <CardContent className="p-4 space-y-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-muted-foreground border-b pb-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </div>

            {/* Collection Filter */}
            <div className="space-y-1">
              <label className="text-muted-foreground">Portfolio Collection</label>
              <select
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
                className="w-full border rounded bg-transparent p-2 text-xs font-semibold"
              >
                <option value="ALL">All Collections</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* IPC Filter */}
            <div className="space-y-1">
              <label className="text-muted-foreground">IPC Section Code</label>
              <select
                value={filterIpc}
                onChange={(e) => setFilterIpc(e.target.value)}
                className="w-full border rounded bg-transparent p-2 text-xs font-semibold"
              >
                <option value="ALL">All Codes</option>
                {allIpcCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {(filterIpc !== "ALL" || filterCollection !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterIpc("ALL");
                  setFilterCollection("ALL");
                }}
                className="w-full h-8 text-[11px]"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Saved List Container (3/4 width) */}
        <div className="md:col-span-3 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={filteredPatents.length > 0 && selectedIds.length === filteredPatents.length}
                  onChange={handleSelectAll}
                  className="rounded accent-primary"
                />
                Select All ({filteredPatents.length})
              </label>

              {/* Bulk actions (only when selection exists) */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">|</span>
                  <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="h-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>

                  {/* Add to collection */}
                  <div className="relative">
                    <Button variant="ghost" size="sm" onClick={() => { setShowColMenu(!showColMenu); setShowWsMenu(false); }} className="h-8">
                      <FolderPlus className="h-3.5 w-3.5 mr-1" />
                      Collect
                    </Button>
                    {showColMenu && (
                      <div className="absolute left-0 mt-1 z-20 w-44 bg-popover border rounded-md shadow-lg p-1 space-y-0.5">
                        {collections.map((col) => (
                          <button key={col.id} onClick={() => handleBulkAddToCollection(col.id)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted truncate font-medium">
                            {col.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add to workspace */}
                  <div className="relative">
                    <Button variant="ghost" size="sm" onClick={() => { setShowWsMenu(!showWsMenu); setShowColMenu(false); }} className="h-8">
                      <Briefcase className="h-3.5 w-3.5 mr-1" />
                      Workspace
                    </Button>
                    {showWsMenu && (
                      <div className="absolute left-0 mt-1 z-20 w-44 bg-popover border rounded-md shadow-lg p-1 space-y-0.5">
                        {workspaces.map((ws) => (
                          <button key={ws.id} onClick={() => handleBulkAddToWorkspace(ws.id)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted truncate font-medium">
                            {ws.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" onClick={handleExportCSV} className="h-8">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    Export CSV
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 ${viewMode === "list" ? "bg-muted" : ""}`}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`h-8 w-8 ${viewMode === "grid" ? "bg-muted" : ""}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* List or Grid */}
          {filteredPatents.length > 0 ? (
            <div className={viewMode === "list" ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
              {filteredPatents.map((p) => {
                const isChecked = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="relative group border border-border/60 bg-card rounded-lg p-4 flex items-start gap-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleSelectOne(p.id)}
                      className="rounded accent-primary mt-1.5 cursor-pointer shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => setActivePatent(p)}
                          className="font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          {p.patentNumber}
                          <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePatent(p.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <h3 className="mt-1 text-sm font-bold text-foreground leading-snug line-clamp-1">{p.title}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.assignee} &middot; {p.date}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                        {p.abstract}
                      </p>
                      <div className="mt-3.5 flex gap-1">
                        {(p.ipc || []).map((ipcCode: string) => (
                          <Badge key={ipcCode} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                            {ipcCode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
              <Bookmark className="h-16 w-16 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No saved patents</h3>
              <p className="text-xs text-muted-foreground max-w-[280px] mt-1 mb-4">
                Saved patent list is empty. Go back to search tool to add some files.
              </p>
              <Button size="sm" onClick={() => window.location.href = "/dashboard/search"}>
                Search Patents
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Slide-in Detail Panel */}
      {activePatent && (
        <PatentDetailPanel
          patent={activePatent}
          onClose={() => setActivePatent(null)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
