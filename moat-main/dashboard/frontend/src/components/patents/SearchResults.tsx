"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PatentCard } from "./PatentCard"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react"

interface PatentResult {
  id: string
  patentNumber: string
  title: string
  abstract: string
  assignee: string
  filingDate: string
  status: string
  cpcClassifications?: string[]
  similarityScore?: number
  isSaved?: boolean
  domain?: string
}

interface SearchResultsProps {
  results?: PatentResult[]
  totalCount?: number
  timeTaken?: number
  currentPage?: number
  totalPages?: number
  loading?: boolean
  onPageChange?: (page: number) => void
  onSaveToggle?: (id: string) => void
  className?: string
  searchQuery?: string
}

export function SearchResults({
  results = [],
  totalCount = 0,
  timeTaken,
  currentPage = 1,
  totalPages = 1,
  loading = false,
  onPageChange,
  onSaveToggle,
  className,
  searchQuery = "",
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <PatentCard
              key={i}
              id=""
              patentNumber=""
              title=""
              abstract=""
              assignee=""
              filingDate=""
              status=""
              loading
            />
          ))}
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 text-center",
          className
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Search className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">
          No patents found
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1 max-w-md">
          Try adjusting your search terms or filters to find relevant patents
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span>
          <span>results found</span>
          {timeTaken !== undefined && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{timeTaken.toFixed(2)}s</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((patent, index) => (
          <motion.div
            key={patent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <PatentCard
              {...patent}
              searchQuery={searchQuery}
              onSaveToggle={onSaveToggle}
            />
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              if (totalPages <= 7) return true
              if (page === 1 || page === totalPages) return true
              if (Math.abs(page - currentPage) <= 1) return true
              return false
            })
            .map((page, idx, arr) => {
              const showEllipsis = idx > 0 && page - arr[idx - 1] > 1
              return (
                <React.Fragment key={page}>
                  {showEllipsis && (
                    <span className="px-1 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => onPageChange?.(page)}
                  >
                    {page}
                  </Button>
                </React.Fragment>
              )
            })}

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
