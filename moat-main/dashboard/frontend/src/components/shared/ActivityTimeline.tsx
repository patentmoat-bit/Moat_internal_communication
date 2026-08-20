import React from 'react';
import { Clock, CheckCircle, RefreshCw, FileText, User } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  project_id: string;
  module_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  description: string;
  previous_state: string;
  new_state: string;
  metadata: any;
  created_at: string;
}

interface ActivityTimelineProps {
  activities: ActivityEvent[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl">
        <Clock className="h-12 w-12 opacity-20 mx-auto mb-3" />
        <p className="font-semibold">No activities found.</p>
      </div>
    );
  }

  const getIcon = (action: string) => {
    if (action.includes('STATUS_CHANGED')) return <RefreshCw className="h-4 w-4 text-blue-500" />;
    if (action.includes('DOCUMENT')) return <FileText className="h-4 w-4 text-purple-500" />;
    if (action.includes('APPROVED')) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-card border flex items-center justify-center shrink-0">
              {getIcon(activity.action)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-px h-full bg-border/60 my-2"></div>
            )}
          </div>
          <div className="pb-6 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground">{activity.actor_role}</span>
              <span className="text-xs text-muted-foreground">
                • {new Date(activity.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-foreground mb-1">{activity.description}</p>
            {(activity.previous_state || activity.new_state) && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/20 rounded-lg border border-border/40 w-fit">
                {activity.previous_state && (
                  <span className="text-xs text-muted-foreground">{activity.previous_state}</span>
                )}
                {activity.previous_state && activity.new_state && (
                  <span className="text-xs text-muted-foreground">→</span>
                )}
                {activity.new_state && (
                  <span className="text-xs font-semibold text-foreground">{activity.new_state}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
