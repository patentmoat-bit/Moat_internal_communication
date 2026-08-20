"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { User as UserType } from "@/types"

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: UserType
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const pathname = usePathname()
  const isZyra = pathname === "/dashboard/zyra"
  const isCeoRoute = pathname.startsWith("/ceo")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Sidebar
        user={user}
        isMobile
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMenuToggle={() => setMobileSidebarOpen(true)}
        />

        {isZyra ? (
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <main
              className={cn(
                isCeoRoute
                  ? "w-full px-4 md:px-6 lg:px-8 py-4 md:py-6"
                  : "container mx-auto p-4 md:p-6 lg:p-8",
                "min-h-full"
              )}
            >
              {children}
            </main>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
