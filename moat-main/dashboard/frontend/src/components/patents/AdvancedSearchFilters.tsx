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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Search,
  X,
  Building2,
  Calendar,
  Hash,
  User,
  Globe,
  ArrowUpDown,
  FileText,
} from "lucide-react"
import type { AdvancedSearchFilters as FilterType } from "@/types"

interface AdvancedSearchFiltersProps {
  onApply: (filters: FilterType) => void
  onClear: () => void
  className?: string
  initialFilters?: FilterType
}

const defaultFilters: FilterType = {}

export function AdvancedSearchFilters({
  onApply,
  onClear,
  className,
  initialFilters,
}: AdvancedSearchFiltersProps) {
  const [filters, setFilters] = React.useState<FilterType>(initialFilters || defaultFilters)

  React.useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
    }
  }, [initialFilters])

  const updateFilter = (key: keyof FilterType, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value || undefined }
      return next
    })
  }

  const handleApply = () => {
    onApply(filters)
  }

  const handleClear = () => {
    setFilters(defaultFilters)
    onClear()
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== "")

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Advanced Filters</h3>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {Object.values(filters).filter((v) => v !== undefined && v !== "").length}
            </span>
          )}
        </div>
      </div>

      <Accordion type="multiple" className="px-4 pb-4">
        <AccordionItem value="text">
          <AccordionTrigger className="text-xs font-medium">Text Search</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Keywords
              </Label>
              <Input
                placeholder="Patent keywords..."
                value={filters.query || ""}
                onChange={(e) => updateFilter("query", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Patent Number
              </Label>
              <Input
                placeholder="e.g. US12345678"
                value={filters.patent_number || ""}
                onChange={(e) => updateFilter("patent_number", e.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="parties">
          <AccordionTrigger className="text-xs font-medium">Parties</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Assignee
              </Label>
              <Input
                placeholder="Company or organization..."
                value={filters.assignee || ""}
                onChange={(e) => updateFilter("assignee", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Inventor
              </Label>
              <Input
                placeholder="Inventor name..."
                value={filters.inventor || ""}
                onChange={(e) => updateFilter("inventor", e.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dates">
          <AccordionTrigger className="text-xs font-medium">Dates</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Filing Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => updateFilter("date_from", e.target.value)}
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => updateFilter("date_to", e.target.value)}
                  placeholder="To"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Publication Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.pub_date_from || ""}
                  onChange={(e) => updateFilter("pub_date_from", e.target.value)}
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={filters.pub_date_to || ""}
                  onChange={(e) => updateFilter("pub_date_to", e.target.value)}
                  placeholder="To"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="classification">
          <AccordionTrigger className="text-xs font-medium">Classification</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                CPC Classification
              </Label>
              <Input
                placeholder="e.g. G06F, H04L"
                value={filters.cpc_class || ""}
                onChange={(e) => updateFilter("cpc_class", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                IPC Classification
              </Label>
              <Input
                placeholder="e.g. A61K, G01N"
                value={filters.ipc_class || ""}
                onChange={(e) => updateFilter("ipc_class", e.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="other">
          <AccordionTrigger className="text-xs font-medium">Other</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Source
              </Label>
              <Select
                value={filters.source || ""}
                onValueChange={(v) => updateFilter("source", v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="uspto">USPTO</SelectItem>
                  <SelectItem value="epo">EPO</SelectItem>
                  <SelectItem value="wipo">WIPO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort By
              </Label>
              <Select
                value={filters.sort || ""}
                onValueChange={(v) => updateFilter("sort", v === "relevance" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Relevance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="filing_date:desc">Filing Date (newest)</SelectItem>
                  <SelectItem value="filing_date:asc">Filing Date (oldest)</SelectItem>
                  <SelectItem value="publication_date:desc">Pub. Date (newest)</SelectItem>
                  <SelectItem value="publication_date:asc">Pub. Date (oldest)</SelectItem>
                  <SelectItem value="title.raw:asc">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Status
              </Label>
              <Select
                value={filters.status || ""}
                onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="granted">Granted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex gap-2 px-4 pb-4">
        <Button onClick={handleApply} className="flex-1" size="sm">
          <Search className="mr-2 h-3 w-3" />
          Apply
        </Button>
        <Button variant="outline" onClick={handleClear} size="sm" className="px-3">
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
