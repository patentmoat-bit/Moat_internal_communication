"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <AlertCircle className="h-16 w-16 text-destructive" />
      <h1 className="mt-6 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </div>
  );
}
