"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MOAT — Workflow Stepper Component
// Visual stepper showing all 13 lifecycle stages for a project.
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, Circle, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_STATUSES,
  STATUS_META,
  getStatusIndex,
  type WorkflowStatus,
} from "@/lib/events/workflowStateMachine";

interface WorkflowStepperProps {
  /** The project's current status */
  currentStatus: WorkflowStatus;
  /** Statuses that have been completed (from workflow history) */
  completedStatuses?: WorkflowStatus[];
  /** Statuses where the project was rejected/sent back */
  rejectedStatuses?: WorkflowStatus[];
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Compact mode for table rows */
  compact?: boolean;
  /** Callback for when a status is clicked */
  onStatusClick?: (status: WorkflowStatus) => void;
}

export function WorkflowStepper({
  currentStatus,
  completedStatuses = [],
  rejectedStatuses = [],
  direction = "horizontal",
  compact = false,
  onStatusClick,
}: WorkflowStepperProps) {
  const currentIndex = getStatusIndex(currentStatus);
  const completedSet = new Set(completedStatuses);
  const rejectedSet = new Set(rejectedStatuses);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {WORKFLOW_STATUSES.map((status, idx) => {
          const isCompleted = completedSet.has(status);
          const isCurrent = status === currentStatus;
          const isRejected = rejectedSet.has(status);

          return (
            <div
              key={status}
              title={STATUS_META[status].label}
              onClick={() => onStatusClick && onStatusClick(status)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                onStatusClick && "cursor-pointer hover:scale-125",
                isCompleted && "bg-emerald-500",
                isCurrent && "bg-[#c9a84c] ring-2 ring-[#c9a84c]/30 animate-pulse",
                isRejected && "bg-red-500",
                !isCompleted && !isCurrent && !isRejected && "bg-muted-foreground/20"
              )}
            />
          );
        })}
      </div>
    );
  }

  if (direction === "vertical") {
    return (
      <div className="flex flex-col gap-0">
        {WORKFLOW_STATUSES.map((status, idx) => {
          const isCompleted = completedSet.has(status);
          const isCurrent = status === currentStatus;
          const isRejected = rejectedSet.has(status);
          const isFuture = !isCompleted && !isCurrent && !isRejected;
          const meta = STATUS_META[status];
          const isLast = idx === WORKFLOW_STATUSES.length - 1;

          return (
            <div key={status} className="flex items-stretch gap-3">
              {/* Connector line + icon */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStatusClick && onStatusClick(status)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    onStatusClick && "cursor-pointer hover:scale-110",
                    isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                    isCurrent && "bg-[#c9a84c] border-[#c9a84c] text-white shadow-lg shadow-[#c9a84c]/30",
                    isRejected && "bg-red-500 border-red-500 text-white",
                    isFuture && "bg-background border-border text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isRejected ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : isCurrent ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </button>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[24px]",
                      isCompleted ? "bg-emerald-500" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className={cn("pb-4", isCurrent && "pb-5")}>
                <button
                  type="button"
                  onClick={() => onStatusClick && onStatusClick(status)}
                  className={cn(
                    "text-sm font-medium leading-8 hover:underline text-left",
                    !onStatusClick && "hover:no-underline cursor-default",
                    isCompleted && "text-emerald-600",
                    isCurrent && "text-[#c9a84c] font-bold",
                    isRejected && "text-red-500",
                    isFuture && "text-muted-foreground/50"
                  )}
                >
                  {meta.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {WORKFLOW_STATUSES.map((status, idx) => {
        const isCompleted = completedSet.has(status);
        const isCurrent = status === currentStatus;
        const isRejected = rejectedSet.has(status);
        const isFuture = !isCompleted && !isCurrent && !isRejected;
        const meta = STATUS_META[status];
        const isLast = idx === WORKFLOW_STATUSES.length - 1;

        return (
          <div key={status} className="flex items-center">
            {/* Step */}
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <button
                type="button"
                onClick={() => onStatusClick && onStatusClick(status)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                  onStatusClick && "cursor-pointer hover:scale-110",
                  isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                  isCurrent &&
                    "bg-[#c9a84c] border-[#c9a84c] text-white shadow-lg shadow-[#c9a84c]/30 animate-pulse",
                  isRejected && "bg-red-500 border-red-500 text-white",
                  isFuture && "bg-background border-border text-muted-foreground/30"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isRejected ? (
                  <RotateCcw className="h-4 w-4" />
                ) : isCurrent ? (
                  <span className="text-xs font-bold">{idx + 1}</span>
                ) : (
                  <span className="text-[10px]">{idx + 1}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onStatusClick && onStatusClick(status)}
                className={cn(
                  "text-[9px] font-medium text-center leading-tight max-w-[70px] hover:underline",
                  !onStatusClick && "hover:no-underline cursor-default",
                  isCompleted && "text-emerald-600",
                  isCurrent && "text-[#c9a84c] font-bold",
                  isRejected && "text-red-500 line-through",
                  isFuture && "text-muted-foreground/40"
                )}
              >
                {meta.label}
              </button>
            </div>

            {/* Connector */}
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-4 sm:w-6 md:w-8 mt-[-14px]",
                  isCompleted ? "bg-emerald-500" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
