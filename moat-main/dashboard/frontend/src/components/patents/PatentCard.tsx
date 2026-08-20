"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bookmark,
  BookmarkCheck,
  FileText,
  Building2,
  Calendar,
  Award,
} from "lucide-react"

interface HighlightTextProps {
  text: string
  query?: string
}

export function HighlightText({ text, query }: HighlightTextProps) {
  if (!text) return null
  if (!query || !query.trim()) return <>{text}</>

  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "else", 
    "for", "to", "in", "on", "at", "by", "from", "with", "about", 
    "as", "of", "is", "are", "was", "were", "be", "been", "this", 
    "that", "these", "those"
  ])

  // Split query into terms
  const terms = query
    .split(/[\s,._\-+/\\()]+/g)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0 && !stopWords.has(t))

  if (terms.length === 0) return <>{text}</>

  // Build regex patterns for each term, handling wildcards * and ?
  const patterns = terms.map(t => {
    // Escape all regex characters except * and ?
    let pattern = t.replace(/[-\/\\^$.()|[\]{}]/g, '\\$&')
    // Replace * with \w* and ? with \w
    pattern = pattern.replace(/\*/g, '\\w*').replace(/\?/g, '\\w')
    
    const startWithWildcard = t.startsWith('*')
    const endWithWildcard = t.endsWith('*')
    
    let regexStr = pattern
    if (!startWithWildcard) {
      regexStr = '\\b' + regexStr
    }
    if (!endWithWildcard) {
      regexStr = regexStr + '\\b'
    }
    return regexStr
  })

  // Also include the full query phrase if it contains wildcards
  const fullPhrase = query.trim().toLowerCase()
  if (!terms.includes(fullPhrase)) {
    let phrasePattern = fullPhrase.replace(/[-\/\\^$.()|[\]{}]/g, '\\$&')
    phrasePattern = phrasePattern.replace(/\*/g, '\\w*').replace(/\?/g, '\\w')
    patterns.unshift(phrasePattern)
  }

  // Sort patterns by length descending so longer matches take precedence
  const uniquePatterns = Array.from(new Set(patterns)).sort((a, b) => b.length - a.length)
  
  const regex = new RegExp(`(${uniquePatterns.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = regex.test(part)
        return isMatch ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-800/40 text-foreground rounded-sm px-0.5 font-semibold transition-colors duration-150 border-b border-yellow-400 dark:border-yellow-600/30"
          >
            {part}
          </mark>
        ) : (
          part
        )
      })}
    </>
  )
}

interface PatentCardProps {
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
  onSaveToggle?: (id: string) => void
  loading?: boolean
  className?: string
  searchQuery?: string
  domain?: string
}

export function PatentCard({
  id,
  patentNumber,
  title,
  abstract,
  assignee,
  filingDate,
  status,
  cpcClassifications = [],
  similarityScore,
  isSaved = false,
  onSaveToggle,
  loading = false,
  className,
  searchQuery = "",
  domain,
}: PatentCardProps) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <Card className={cn("group cursor-pointer overflow-hidden", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-xs shrink-0">
                  <HighlightText text={patentNumber} query={searchQuery} />
                </Badge>
                {domain && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 shrink-0 font-medium">
                    <HighlightText text={domain} query={searchQuery} />
                  </Badge>
                )}
                {similarityScore !== undefined && (
                  <Badge
                    className={cn(
                      "shrink-0",
                      similarityScore >= 80
                        ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                        : similarityScore >= 50
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {similarityScore}% match
                  </Badge>
                )}
              </div>

              <Link
                href={`/dashboard/patents/${id}`}
                className="text-base font-semibold leading-snug hover:text-primary transition-colors line-clamp-2"
              >
                <HighlightText text={title} query={searchQuery} />
              </Link>

              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                <HighlightText text={abstract} query={searchQuery} />
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <HighlightText text={assignee} query={searchQuery} />
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {filingDate}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" />
                  <span
                    className={cn(
                      "font-medium",
                      status === "Granted"
                        ? "text-green-600 dark:text-green-400"
                        : status === "Pending"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {status}
                  </span>
                </span>
              </div>

              {cpcClassifications.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cpcClassifications.map((cpc) => (
                    <Badge
                      key={cpc}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      <HighlightText text={cpc} query={searchQuery} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 transition-colors",
                isSaved && "text-primary hover:text-primary"
              )}
              onClick={(e) => {
                e.preventDefault()
                onSaveToggle?.(id)
              }}
            >
              {isSaved ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
