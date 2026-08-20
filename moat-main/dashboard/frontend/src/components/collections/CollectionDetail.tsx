"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PatentCard } from "@/components/patents/PatentCard"
import {
  FolderOpen,
  Edit,
  Trash2,
  ArrowLeft,
  FileText,
} from "lucide-react"

interface CollectionPatent {
  id: string
  patentNumber: string
  title: string
  abstract: string
  assignee: string
  filingDate: string
  status: string
  cpcClassifications?: string[]
}

interface CollectionDetailProps {
  id: string
  name: string
  description?: string
  patents?: CollectionPatent[]
  loading?: boolean
  onBack?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onRemovePatent?: (patentId: string) => void
  onPatentClick?: (patentId: string) => void
  className?: string
}

export function CollectionDetail({
  id,
  name,
  description,
  patents = [],
  loading = false,
  onBack,
  onEdit,
  onDelete,
  onRemovePatent,
  onPatentClick,
  className,
}: CollectionDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold">{name}</h1>
              <Badge variant="secondary" className="ml-2">
                {patents.length} patent{patents.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {patents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            Collection is empty
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1 max-w-md">
            Add patents to this collection from search results or your saved patents
          </p>
          <Button className="mt-4" variant="outline" onClick={onBack}>
            Browse Patents
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {patents.map((patent, index) => (
            <motion.div
              key={patent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group relative"
            >
              <div
                className="cursor-pointer"
                onClick={() => onPatentClick?.(patent.id)}
              >
                <PatentCard
                  id={patent.id}
                  patentNumber={patent.patentNumber}
                  title={patent.title}
                  abstract={patent.abstract}
                  assignee={patent.assignee}
                  filingDate={patent.filingDate}
                  status={patent.status}
                  cpcClassifications={patent.cpcClassifications}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemovePatent?.(patent.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
