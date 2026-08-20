"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2, Globe, Clock, PenLine, Award, XCircle } from "lucide-react";

const KPIS = [
  { key: "total",     label: "Total Projects",  icon: TrendingUp,   from: "#c9a84c", to: "#e8c97a" },
  { key: "approved",  label: "Approved",         icon: CheckCircle2, from: "#10b981", to: "#34d399" },
  { key: "filed",     label: "Filed",            icon: Globe,        from: "#06b6d4", to: "#22d3ee" },
  { key: "pending",   label: "Pending",          icon: Clock,        from: "#3b82f6", to: "#60a5fa" },
  { key: "drafting",  label: "Drafting",         icon: PenLine,      from: "#f59e0b", to: "#fbbf24" },
  { key: "completed", label: "Completed",        icon: Award,        from: "#8b5cf6", to: "#a78bfa" },
  { key: "rejected",  label: "Rejected",         icon: XCircle,      from: "#ef4444", to: "#f87171" },
];

function AnimatedCount({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(start);
    }, 35);
    return () => clearInterval(t);
  }, [target]);
  return <span>{val}</span>;
}

export function PatentKPIGrid({ summary }: { summary: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {KPIS.map((k, i) => (
        <motion.div
          key={k.key}
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 200, damping: 20 }}
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 group cursor-default"
          whileHover={{ scale: 1.04, transition: { duration: 0.18 } }}
        >
          {/* glow blob */}
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-50"
            style={{ background: `radial-gradient(circle, ${k.from}, transparent)` }} />
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg" style={{ background: `${k.from}22` }}>
              <k.icon className="h-4 w-4" style={{ color: k.from }} />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">{k.label}</p>
          <p className="text-3xl font-black" style={{ background: `linear-gradient(135deg, ${k.from}, ${k.to})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            <AnimatedCount target={summary[k.key] ?? 0} />
          </p>
          {/* bottom accent bar */}
          <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full"
            style={{ background: `linear-gradient(90deg, ${k.from}, ${k.to})` }} />
        </motion.div>
      ))}
    </div>
  );
}
