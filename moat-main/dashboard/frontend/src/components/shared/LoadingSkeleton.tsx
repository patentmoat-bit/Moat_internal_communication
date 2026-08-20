import React from "react";

export function PatentCardSkeleton() {
  return (
    <div className="border border-border/60 rounded-lg p-4 mb-3 animate-pulse bg-card">
      <div className="flex justify-between mb-2">
        <div className="h-3.5 bg-muted rounded w-32" />
        <div className="h-3.5 bg-muted rounded w-16" />
      </div>
      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3.5 bg-muted rounded w-1/2 mb-3" />
      <div className="h-3 bg-muted rounded w-full mb-1.5" />
      <div className="h-3 bg-muted rounded w-4/5 mb-3" />
      <div className="flex gap-2">
        <div className="h-6 bg-muted rounded w-20" />
        <div className="h-6 bg-muted rounded w-16" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="border border-border/60 rounded-lg p-5 animate-pulse bg-card">
      <div className="h-8 bg-muted rounded w-16 mb-2" />
      <div className="h-3.5 bg-muted rounded w-24" />
    </div>
  );
}

export function SearchResultsSkeleton({ count = 5, className = "space-y-4" }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <PatentCardSkeleton key={i} />
      ))}
    </div>
  );
}
