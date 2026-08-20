import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessStateProps {
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function SuccessState({ 
  title, 
  message, 
  actionText,
  onAction,
  className = "" 
}: SuccessStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="font-semibold text-foreground text-xl mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-sm text-muted-foreground mb-6 max-w-[400px]">
          {message}
        </p>
      )}
      {actionText && onAction && (
        <Button onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
