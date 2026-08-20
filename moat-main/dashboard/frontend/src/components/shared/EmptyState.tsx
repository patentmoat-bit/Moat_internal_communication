import React, { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode | string;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-3xl">
        {icon}
      </div>
      <p className="font-semibold text-foreground text-base mb-2">
        {title}
      </p>
      <p className="text-sm text-muted-foreground mb-5 max-w-[300px]">
        {description}
      </p>
      {action && (
        <button onClick={onAction} className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}
