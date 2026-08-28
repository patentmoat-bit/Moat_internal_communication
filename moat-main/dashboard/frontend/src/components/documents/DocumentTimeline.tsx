import React from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  currentStatus: string;
  isDrafter?: boolean;
}

export function DocumentTimeline({ currentStatus, isDrafter }: TimelineProps) {
  // Matched against the real status strings written by
  // src/modules/documents/repository.ts / controller.ts (confirmed against the
  // live patent_documents data) — the previous version matched against
  // "Draft" and "CEO Approval Pending", neither of which any real document
  // status ever equals, so the stepper silently fell back to stage 0 for
  // almost every document regardless of its actual progress.
  const STAGES = [
    { label: "Draft", statuses: ["Draft Created"] },
    {
      label: "Design Review",
      statuses: [
        "Pending Design Review", "Pending Design Work", "Design In Progress",
        "Under Design Review", "Changes Requested", "Returned to Designing Team",
      ],
    },
    {
      label: isDrafter ? "Drafter Review" : "Analyst Review",
      statuses: isDrafter
        ? ["Waiting for Drafter Review"]
        : ["Waiting for Patent Analyst Review", "Uploaded by Patent Analyst"],
    },
    { label: "CEO Review", statuses: ["CEO Approval Pending"] },
    { label: "Approved", statuses: ["CEO Approved", "Approved", "Completed"] },
  ];
  const currentIndex = STAGES.findIndex((s) => s.statuses.includes(currentStatus));
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex items-center w-full my-6">
      {STAGES.map((stage, index) => {
        const isCompleted = index < activeIndex || currentStatus === "Completed";
        const isActive = index === activeIndex;

        return (
          <React.Fragment key={stage.label}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  isCompleted ? "bg-green-500 border-green-500 text-white" :
                  isActive ? "bg-blue-500 border-blue-500 text-white" :
                  "bg-white border-gray-300 text-gray-300"
                )}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isActive ? <Clock className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <span className="text-xs mt-2 font-medium text-gray-600">{stage.label}</span>
            </div>
            {index < STAGES.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-2 rounded-full",
                  index < activeIndex ? "bg-green-500" : "bg-gray-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
