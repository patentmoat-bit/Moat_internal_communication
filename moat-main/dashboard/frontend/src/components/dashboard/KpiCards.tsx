"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface KpiCard {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  href: string;
  trend?: number;
}

export function KpiCards({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.05,duration:0.4}}>
          <Link href={card.href} className="block group">
            <div className={`relative overflow-hidden rounded-xl border ${card.border} bg-card p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</p>
                  {card.sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{card.sub}</p>}
                  {card.trend !== undefined && (
                    <p className={`mt-1 text-xs font-medium ${card.trend >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                      {card.trend >= 0 ? "↑" : "↓"} {Math.abs(card.trend)}% vs last week
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-3 ${card.bg} group-hover:scale-110 transition-transform`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
