"use client";

import * as React from "react";
import type { Session } from "@/lib/types";

const SessionContext = React.createContext<Session | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** The session resolved on the server for this request. Never null inside the
 *  app shell -- the layout redirects to login before rendering. */
export function useSession(): Session {
  const session = React.useContext(SessionContext);
  if (session === null) {
    throw new Error("useSession must be used inside the authenticated app shell");
  }
  return session;
}

export function usePermission(permission: string): boolean {
  return useSession().permissions.includes(permission);
}
