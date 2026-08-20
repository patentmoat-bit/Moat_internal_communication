import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  text?: string;
  className?: string;
}

export function RetryButton({ onRetry, text = "Retry", className = "" }: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleRetry} 
      disabled={isRetrying}
      className={className}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
      {isRetrying ? "Retrying..." : text}
    </Button>
  );
}
