import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-4 ${className}`}>
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
    </div>
  );
}
