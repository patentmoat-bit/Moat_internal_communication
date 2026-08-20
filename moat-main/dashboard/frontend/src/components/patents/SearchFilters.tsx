"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  X,
  Filter,
  Building2,
  Calendar,
  Hash,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react"

interface SearchFiltersProps {
  onApply: (filters: FilterValues) => void
  onClear: () => void
  className?: string
}

export interface FilterValues {
  keyword: string
  assignee: string
  status: string
  dateFrom: string
  dateTo: string
  cpcClassification: string
}

const defaultFilters: FilterValues = {
  keyword: "",
  assignee: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  cpcClassification: "",
}

export function SearchFilters({ onApply, onClear, className }: SearchFiltersProps) {
  const [filters, setFilters] = React.useState<FilterValues>(defaultFilters)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const updateFilter = (key: keyof FilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApply(filters)
  }

  const handleClear = () => {
    setFilters(defaultFilters)
    onClear()
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "")

  const showFilters = isDesktop || isOpen

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-sm font-medium lg:hidden"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {Object.values(filters).filter((v) => v !== "").length}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 pt-0 lg:pt-4">
              <div className="space-y-2">
                <Label htmlFor="keyword" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  Keyword
                </Label>
                <Input
                  id="keyword"
                  placeholder="Search by keyword..."
                  value={filters.keyword}
                  onChange={(e) => updateFilter("keyword", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Assignee
                </Label>
                <Input
                  id="assignee"
                  placeholder="Company or individual..."
                  value={filters.assignee}
                  onChange={(e) => updateFilter("assignee", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => updateFilter("status", v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="granted">Granted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Date Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => updateFilter("dateFrom", e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => updateFilter("dateTo", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpc" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  CPC Classification
                </Label>
                <Input
                  id="cpc"
                  placeholder="e.g. G06F, H04L..."
                  value={filters.cpcClassification}
                  onChange={(e) => updateFilter("cpcClassification", e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleApply} className="flex-1">
                  <Search className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={handleClear} className="px-3">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
