import React from "react";
import { AlertTriangle } from "lucide-react";
import { RetryButton } from "./RetryButton";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => Promise<void> | void;
  className?: string;
}

export function ErrorState({ 
  title = "An error occurred", 
  message, 
  onRetry,
  className = "" 
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center bg-red-50/50 rounded-xl border border-red-100 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="font-semibold text-red-900 text-lg mb-2">
        {title}
      </h3>
      <p className="text-sm text-red-700/80 mb-6 max-w-[400px]">
        {message}
      </p>
      {onRetry && (
        <RetryButton onRetry={onRetry} />
      )}
    </div>
  );
}
