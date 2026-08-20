import React from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  currentStatus: string;
  isDrafter?: boolean;
}

export function DocumentTimeline({ currentStatus, isDrafter }: TimelineProps) {
  const STAGES = [
    { label: "Draft", status: "Draft" },
    { label: "Design Review", status: "Pending Design Review" },
    { label: isDrafter ? "Drafter Review" : "Analyst Review", status: isDrafter ? "Waiting for Drafter Review" : "Waiting for Patent Analyst Review" },
    { label: "CEO Review", status: "CEO Approval Pending" },
    { label: "Approved", status: "CEO Approved" },
  ];
  const currentIndex = STAGES.findIndex((s) => s.status === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex items-center w-full my-6">
      {STAGES.map((stage, index) => {
        const isCompleted = index < activeIndex || stage.status === "CEO Approved" || currentStatus === "Completed";
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
