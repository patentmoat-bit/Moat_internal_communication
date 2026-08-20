"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Bookmark,
  Plus,
  Trash2,
  Search,
  Clock,
  Bell,
} from "lucide-react"
import type { SavedSearch } from "@/types"

interface SavedSearchesProps {
  searches: SavedSearch[]
  onSave: (data: { name: string; query?: string; filters?: Record<string, unknown> }) => void
  onDelete: (id: string) => void
  onLoadSearch: (search: SavedSearch) => void
  isLoading?: boolean
}

export function SavedSearches({
  searches,
  onSave,
  onDelete,
  onLoadSearch,
  isLoading,
}: SavedSearchesProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim() })
    setName("")
    setDialogOpen(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Current Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="search-name">Search Name</Label>
                <Input
                  id="search-name"
                  placeholder="e.g. AI Patents 2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                <Bookmark className="mr-2 h-4 w-4" />
                Save Search
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved searches yet. Save a search to quickly access it later.
          </p>
        ) : (
          <div className="space-y-1">
            {searches.map((search) => (
              <div
                key={search.id}
                className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                onClick={() => onLoadSearch(search)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{search.name}</p>
                    {search.query && (
                      <p className="text-xs text-muted-foreground truncate">{search.query}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {search.notify_on_new && (
                    <Bell className="h-3 w-3 text-muted-foreground" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(search.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
