"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Clock, ArrowRight } from "lucide-react"

interface SearchEntry {
  id: string
  query: string
  timestamp: string
  resultCount: number
}

interface RecentSearchesProps {
  searches?: SearchEntry[]
  loading?: boolean
  onSearchClick?: (query: string) => void
  className?: string
}

export function RecentSearches({
  searches = [],
  loading = false,
  onSearchClick,
  className,
}: RecentSearchesProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
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
          <Clock className="h-5 w-5 text-muted-foreground" />
          Recent Searches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No recent searches
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your recent patent searches will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {searches.map((search, index) => (
              <motion.button
                key={search.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSearchClick?.(search.query)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Search className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {search.query}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {search.timestamp}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {search.resultCount}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
