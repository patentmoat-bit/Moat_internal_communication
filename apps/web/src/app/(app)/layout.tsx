import { redirect } from "next/navigation";
import { SessionProvider } from "@/components/auth/session-context";
import { RoleProvider } from "@/components/auth/role-context";
import { EventStreamProvider } from "@/components/events/event-stream";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Checked on the server for every request in this segment. A revoked or
  // expired session cannot render the shell even once.
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <RoleProvider>
        <EventStreamProvider>
          <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </EventStreamProvider>
      </RoleProvider>
    </SessionProvider>
  );
}
