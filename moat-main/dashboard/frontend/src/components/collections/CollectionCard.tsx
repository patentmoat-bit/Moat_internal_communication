"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FolderOpen, MoreHorizontal, Edit, Trash2, FileText } from "lucide-react"

interface CollectionCardProps {
  id: string
  name: string
  description?: string
  patentCount: number
  onClick?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function CollectionCard({
  id,
  name,
  description,
  patentCount,
  onClick,
  onEdit,
  onDelete,
  className,
}: CollectionCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <Card
        className={cn(
          "group cursor-pointer transition-colors hover:border-primary/50",
          className
        )}
        onClick={() => onClick?.(id)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug truncate max-w-[200px]">
                  {name}
                </h3>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{patentCount} patent{patentCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(id) }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete?.(id) }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
