"use client";

import Link from "next/link";
import { 
  Settings, Users, LayoutDashboard, Layout, ToggleLeft, 
  Workflow, Database, Bell, Shield, Activity, Mail, SearchCode
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const cmsModules = [
  {
    title: "Role & Permissions",
    description: "Manage roles, CRUD permissions, and feature access.",
    icon: Shield,
    href: "/dashboard/settings/roles",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Dashboard Builder",
    description: "Configure role-based dashboards and widgets.",
    icon: LayoutDashboard,
    href: "/dashboard", // Fallback until builder exists
    color: "text-indigo-500",
    bg: "bg-indigo-500/10"
  },
  {
    title: "Sidebar Builder",
    description: "Dynamic sidebar menus and nested links.",
    icon: Layout,
    href: "/dashboard/settings", // Fallback until builder exists
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Feature Management",
    description: "Enable/disable features and SaaS modules.",
    icon: ToggleLeft,
    href: "/cms/features",
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  {
    title: "Workflows",
    description: "Configure stages and approval processes.",
    icon: Workflow,
    href: "/dashboard/settings", // Fallback until workflow builder exists
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  },
  {
    title: "Application Settings",
    description: "Manage themes, logos, and global settings.",
    icon: Settings,
    href: "/dashboard/settings/email", // Mapped to general settings for now
    color: "text-zinc-500",
    bg: "bg-zinc-500/10"
  },
  {
    title: "Notifications",
    description: "Email and in-app alert templates.",
    icon: Bell,
    href: "/dashboard/settings/alerts",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10"
  },
  {
    title: "Email Notification Rule Engine",
    description: "Dynamic rule-based email routing and templates.",
    icon: Mail,
    href: "/cms/notification-rules",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    title: "Audit Logs",
    description: "Track all CMS modifications.",
    icon: Activity,
    href: "/dashboard/settings/audit",
    color: "text-rose-500",
    bg: "bg-rose-500/10"
  },
  {
    title: "Message Trace",
    description: "Search and track email delivery logs.",
    icon: SearchCode,
    href: "/cms/message-trace",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  }
];

export default function CMSDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centralized CMS</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Control center for configuring the entire SaaS application. Only Super Admins have access.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {cmsModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.title} href={module.href}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full border-muted/60 bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                  <div className={`p-3 rounded-xl ${module.bg}`}>
                    <Icon className={`w-6 h-6 ${module.color}`} />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm mt-2">
                    {module.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
