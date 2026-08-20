"use client";

import Link from "next/link";
import { LucideIcon, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface StatItem {
  label: string;
  value: string | number | React.ReactNode;
  subValue?: string | React.ReactNode;
  colorClass?: string;
}

interface ExecutiveDashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  stats: StatItem[];
  lastUpdated: string;
  href: string;
  buttonText?: string;
}

export function ExecutiveDashboardCard({
  title,
  description,
  icon: Icon,
  stats,
  lastUpdated,
  href,
  buttonText = "Open Dashboard"
}: ExecutiveDashboardCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full flex"
    >
      <Card className="w-full flex flex-col justify-between overflow-hidden bg-card/45 border-border/40 hover:border-[#c9a84c]/50 transition-colors duration-300 glass-card glow-gold relative group">
        
        {/* Decorative gold background gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-[#c9a84c] transition-colors duration-300 flex items-center gap-2.5">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed pt-1.5 min-h-[44px]">
                  {description}
                </CardDescription>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 shadow-md shadow-[#c9a84c]/5 shrink-0 group-hover:bg-[#c9a84c]/20 group-hover:border-[#c9a84c]/30 transition-all duration-300">
                <Icon className="h-6 w-6 text-[#c9a84c] group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pb-6">
            <div className="p-[1px] rounded-2xl bg-gradient-to-r from-border/30 via-border/10 to-border/30">
              <div className="bg-muted/40 dark:bg-[#131309]/50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                      {stat.label}
                    </div>
                    <div className={`text-xl font-extrabold tracking-tight ${stat.colorClass || "text-foreground"}`}>
                      {stat.value}
                    </div>
                    {stat.subValue && (
                      <div className="text-[10px] text-muted-foreground/50 font-medium">
                        {stat.subValue}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </div>
        
        <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-border/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>Last updated: {lastUpdated}</span>
          </div>
          <Button
            asChild
            className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold text-xs tracking-wide rounded-xl gap-1.5 shadow-lg shadow-[#c9a84c]/10 hover:shadow-[#c9a84c]/20 transition-all duration-300"
          >
            <Link href={href}>
              {buttonText}
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
