"use client";

import { useState } from "react";
import { Folder, FolderPlus, Plus, Calendar, Bookmark, Trash2, ArrowLeft, MoreVertical, Edit2, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

const PRESET_COLORS = [
  "#a855f7", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899",
  "#06b6d4", "#6366f1", "#14b8a6", "#84cc16", "#eab308", "#64748b"
];

export default function CollectionsPage() {
  const { collections, createCollection, deleteCollection, removeFromCollection } = useApp();

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    createCollection(newColName, newColDesc, selectedColor);
    setNewColName("");
    setNewColDesc("");
    setSelectedColor(PRESET_COLORS[0]);
    setModalOpen(false);
  };

  const currentCollection = collections.find((c) => c.id === activeCollectionId);

  // If inside a collection detail view
  if (activeCollectionId && currentCollection) {
    return (
      <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setActiveCollectionId(null)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <Folder className="h-6 w-6" style={{ color: currentCollection.color }} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">{currentCollection.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{currentCollection.description || "No description provided."}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-bold text-foreground mb-4">
            Patents inside Collection ({currentCollection.patents.length})
          </h3>
          {currentCollection.patents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentCollection.patents.map((patent) => (
                <Card key={patent.id} className="relative group border-border/60">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-primary">{patent.patentNumber}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCollection(currentCollection.id, patent.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-foreground leading-snug line-clamp-2">{patent.title}</h4>
                      <p className="mt-1 text-[10px] text-muted-foreground truncate">{patent.assignee}</p>
                    </div>
                    <div className="mt-4 flex gap-1">
                      {patent.ipc?.slice(0, 2).map((ipcCode: string) => (
                        <Badge key={ipcCode} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                          {ipcCode}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
              <Bookmark className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No patents added to this collection yet.</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => window.location.href = "/dashboard/search"}>
                Search and Add Patents
              </Button>
            </div>
          )}
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize patent files into categorized folders, filter portfolios, and review aggregated claims.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5 text-xs font-semibold">
          <FolderPlus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      <Separator />

      {/* Grid */}
      {collections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Card
              key={col.id}
              onClick={() => setActiveCollectionId(col.id)}
              className="cursor-pointer border-border/60 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
                <div>
                  <div className="flex items-start justify-between">
                    <Folder className="h-7 w-7" style={{ color: col.color || "#c9a84c" }} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete collection "${col.name}"?`)) {
                          deleteCollection(col.id);
                        }
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-foreground leading-snug truncate">{col.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {col.description || "No description provided."}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t pt-3 text-[10px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(col.created).toLocaleDateString()}
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {col.patents?.length || 0} patents
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg">
          <Folder className="h-16 w-16 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No collections yet</h3>
          <p className="text-xs text-muted-foreground max-w-[280px] mt-1 mb-4">
            Create collections to start organizing patents into custom portfolios.
          </p>
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Collection
          </Button>
        </div>
      )}

      {/* New Collection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <Card className="relative w-full max-w-md bg-background border shadow-2xl z-10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm">Create New Collection</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-muted-foreground">Collection Name</label>
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. Non-Invasive Diagnostics"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground">Description</label>
                <textarea
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  placeholder="Optional description outlining the scope..."
                  className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground">Folder Theme Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className="h-6 w-6 rounded-full border border-white/10 relative transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && (
                        <span className="absolute inset-0.5 border border-white rounded-full bg-white/30" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9">
                  Cancel
                </Button>
                <Button type="submit" className="h-9">
                  Create Collection
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
