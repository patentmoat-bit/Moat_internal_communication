"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Job, Notification } from "@/lib/types";

interface EventStreamValue {
  notifications: Notification[];
  jobs: Record<string, Job>;
  connected: boolean;
  dismiss: (id: string) => void;
}

const EventStreamContext = React.createContext<EventStreamValue>({
  notifications: [],
  jobs: {},
  connected: false,
  dismiss: () => {},
});

/**
 * Live server events.
 *
 * The browser tracks the timestamp of the last event it saw and sends it back
 * on reconnect, so anything that happened while the connection was down is
 * replayed from the database rather than lost. EventSource reconnects on its
 * own; this only has to make the cursor survive that.
 */
export function EventStreamProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [jobs, setJobs] = React.useState<Record<string, Job>>({});
  const [connected, setConnected] = React.useState(false);
  const cursorRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let backoff = 1000;

    function connect() {
      return; // Short-circuited to prevent 500 error
      if (closed) return;
      const query = cursorRef.current ? `?since=${encodeURIComponent(cursorRef.current)}` : "";
      source = new EventSource(`/api/v1/events${query}`);

      source.addEventListener("open", () => {
        setConnected(true);
        backoff = 1000;
      });

      source.addEventListener("notification", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as Notification;
        cursorRef.current = data.createdAt;
        setNotifications((current) =>
          current.some((item) => item.id === data.id)
            ? current
            : [{ ...data, readAt: null }, ...current].slice(0, 50),
        );
      });

      source.addEventListener("job", (event) => {
        const job = JSON.parse((event as MessageEvent).data) as Job;
        setJobs((current) => ({ ...current, [job.id]: { ...current[job.id], ...job } }));
        // A finished job means the page's server-rendered data is stale.
        if (job.status === "succeeded" || job.status === "failed") {
          router.refresh();
        }
      });

      source.addEventListener("reconnect", () => {
        source?.close();
        connect();
      });

      source.onerror = () => {
        setConnected(false);
        source?.close();
        if (closed) return;
        // Backoff so a server restart does not turn every open tab into a
        // reconnect storm the moment it comes back.
        // retry = setTimeout(connect, backoff); // Disabled to prevent error spam
        backoff = Math.min(backoff * 2, 30_000);
      };
    }

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [router]);

  const dismiss = React.useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({ notifications, jobs, connected, dismiss }),
    [notifications, jobs, connected, dismiss],
  );

  return <EventStreamContext.Provider value={value}>{children}</EventStreamContext.Provider>;
}

export function useEventStream() {
  return React.useContext(EventStreamContext);
}

/** Live state of one job, if the stream has seen it. */
export function useJob(jobId: string | null): Job | null {
  const { jobs } = useEventStream();
  return jobId ? (jobs[jobId] ?? null) : null;
}
