"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Bookmark,
  FolderOpen,
  Activity,
  type LucideIcon,
} from "lucide-react"

interface Activity {
  id: string
  type: "search" | "save" | "collection" | "view"
  description: string
  timestamp: string
}

interface ActivityFeedProps {
  activities?: Activity[]
  loading?: boolean
  className?: string
}

const activityConfig: Record<
  Activity["type"],
  { icon: LucideIcon; color: string; bg: string }
> = {
  search: {
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  save: {
    icon: Bookmark,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  collection: {
    icon: FolderOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  view: {
    icon: Activity,
    color: "text-[#c9a84c]",
    bg: "bg-[#c9a84c]/15 dark:bg-[#c9a84c]/10",
  },
}

export function ActivityFeed({
  activities = [],
  loading = false,
  className,
}: ActivityFeedProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
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
          <Activity className="h-5 w-5 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No recent activity
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your actions across the platform will appear here
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-px bg-border" />
            <div className="space-y-4">
              {activities.map((item, index) => {
                const config = activityConfig[item.type]
                const Icon = config.icon
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex items-start gap-3 pl-10"
                  >
                    <div
                      className={cn(
                        "absolute left-2.5 flex h-5 w-5 items-center justify-center rounded-full",
                        config.bg
                      )}
                    >
                      <Icon className={cn("h-3 w-3", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.timestamp}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
