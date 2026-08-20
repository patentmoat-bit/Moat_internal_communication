"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bookmark,
  Eye,
  Trash2,
  FileText,
  Building2,
  Calendar,
} from "lucide-react"

interface SavedPatent {
  id: string
  patentNumber: string
  title: string
  assignee: string
  filingDate: string
  status: string
}

interface SavedPatentsProps {
  patents?: SavedPatent[]
  loading?: boolean
  onView?: (id: string) => void
  onRemove?: (id: string) => void
  className?: string
}

export function SavedPatents({
  patents = [],
  loading = false,
  onView,
  onRemove,
  className,
}: SavedPatentsProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bookmark className="h-5 w-5 text-muted-foreground" />
          Saved Patents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {patents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No saved patents yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Save patents from search results to access them quickly
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {patents.map((patent, index) => (
              <motion.div
                key={patent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {patent.title}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {patent.patentNumber}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {patent.assignee}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {patent.filingDate}
                    </span>
                    <Badge
                      variant={
                        patent.status === "Granted"
                          ? "default"
                          : patent.status === "Pending"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {patent.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onView?.(patent.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRemove?.(patent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
