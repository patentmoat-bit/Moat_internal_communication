"use client";

import { CornerDownRight, GitBranch } from "lucide-react";
import { Badge, EmptyState, Panel, PanelHeader, cn } from "@moat/ui";
import { claimCategoryLabels } from "@/lib/display";
import type { ClaimCoverage, ClaimTreeNode } from "@/lib/types";

function Node({
  node,
  onSelect,
  selected,
}: {
  node: ClaimTreeNode;
  onSelect?: (n: number) => void;
  selected: number | null;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(node.number)}
        style={{ paddingLeft: `${12 + node.depth * 18}px` }}
        className={cn(
          "flex w-full items-center gap-2 py-1.5 pr-3 text-left transition-colors",
          selected === node.number ? "bg-accent-soft" : "hover:bg-hover",
        )}
      >
        {node.depth > 0 ? (
          <CornerDownRight className="size-3 shrink-0 text-faint" aria-hidden />
        ) : null}
        <span
          className={cn(
            "numeric shrink-0 text-[12px] font-medium",
            node.kind === "independent" ? "text-accent-text" : "text-muted",
          )}
        >
          {node.number}
        </span>
        <span className="truncate text-[12px] text-muted">
          {node.kind === "independent" ? "Independent" : `depends on ${node.dependsOn.join(", ")}`}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {node.multipleDependent ? (
            <Badge tone="caution" title="Depends on more than one claim">
              multi
            </Badge>
          ) : null}
          <span className="text-[10.5px] text-faint">
            {claimCategoryLabels[node.category] ?? node.category}
          </span>
        </span>
      </button>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <Node
              key={`${node.number}-${child.number}`}
              node={child}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ClaimTree({
  tree,
  coverage,
  onSelect,
  selected = null,
}: {
  tree: ClaimTreeNode[];
  coverage: ClaimCoverage;
  onSelect?: (claimNumber: number) => void;
  selected?: number | null;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Claim structure"
        caption={
          coverage.total > 0
            ? `${coverage.independent} independent · ${coverage.dependent} dependent · depth ${coverage.maxDepth}`
            : undefined
        }
      />
      {tree.length === 0 ? (
        <EmptyState icon={<GitBranch />} title="No claims yet" className="py-8" />
      ) : (
        <>
          <ul className="py-1">
            {tree.map((node) => (
              <Node key={node.number} node={node} onSelect={onSelect} selected={selected} />
            ))}
          </ul>
          {coverage.multipleDependent > 0 ? (
            <p className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-faint">
              A multiple dependent claim appears under each of its parents. That is the honest
              rendering — it really does narrow each one, and showing it once would hide a
              dependency. Note that each counts separately for USPTO fees.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}
