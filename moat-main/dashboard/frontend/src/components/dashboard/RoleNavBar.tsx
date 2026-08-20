"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { getRoleWorkspace, type EnterpriseRole } from "@/lib/roleIntelligence";
import { cn } from "@/lib/utils";

interface RoleNavBarProps {
  role: EnterpriseRole;
}

export function RoleNavBar({ role }: RoleNavBarProps) {
  const pathname = usePathname();
  const workspace = getRoleWorkspace(role);

  // Filter modules to avoid duplicates and internal sub-paths if any
  const navItems = workspace.modules.map((m) => {
    // Generate readable labels from path segments
    let label = m.replace("/dashboard/", "").replace(/\/page$/, "");
    if (label === "") label = "Workspace Home";
    else if (label === "workspace/invention") label = "Invention Workspace";
    else {
      // Capitalize segments
      label = label
        .split("/")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" > ");
    }
    return { href: m, label };
  });

  return (
    <div className="flex border-b border-border/40 pb-px mb-6 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors rounded-t-lg",
                isActive ? "text-[#c9a84c]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative z-10">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="role-nav-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c9a84c] rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
