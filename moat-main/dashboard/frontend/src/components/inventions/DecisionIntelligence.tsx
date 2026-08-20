"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { BrainCircuit, TrendingUp, ShieldAlert, Award, Briefcase, Activity, Clock3, Zap, Target, Lightbulb, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const trendData = [
  { year: "2019", citations: 120, filings: 45 },
  { year: "2020", citations: 210, filings: 85 },
  { year: "2021", citations: 380, filings: 140 },
  { year: "2022", citations: 520, filings: 210 },
  { year: "2023", citations: 890, filings: 310 },
  { year: "2024", citations: 1240, filings: 450 },
];

const competitorData = [
  { subject: "AI Optimization", A: 120, B: 110, fullMark: 150 },
  { subject: "Edge Compute", A: 98, B: 130, fullMark: 150 },
  { subject: "Battery Tech", A: 86, B: 130, fullMark: 150 },
  { subject: "Material Sci", A: 99, B: 100, fullMark: 150 },
  { subject: "Data Pipeline", A: 85, B: 90, fullMark: 150 },
  { subject: "UI/UX", A: 65, B: 85, fullMark: 150 },
];

const timelineData = [
  { status: "completed", date: "Oct 2023", title: "Provisional Filed", desc: "Initial patent application submitted." },
  { status: "completed", date: "Jan 2024", title: "Prior Art Search", desc: "No direct conflicts found in CPC G06N." },
  { status: "current", date: "Jun 2024", title: "Non-Provisional Draft", desc: "Finalizing claims for submission." },
  { status: "upcoming", date: "Q3 2024", title: "Office Action Expected", desc: "Anticipating section 103 rejections." },
  { status: "upcoming", date: "2026", title: "Target Grant", desc: "Estimated allowance date based on art unit 2120." },
];

function ScoreCard({ title, value, icon: Icon, description, trend }: { title: string; value: string | number; icon: React.ElementType; description: string; trend: string }) {
  return (
    <div className="rounded-lg pfs-panel p-5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[hsl(var(--pfs-cyan))]/5 rounded-bl-[100%] transition-transform group-hover:scale-110" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold pfs-muted flex items-center gap-2">
            <Icon className="h-4 w-4 pfs-cyan" />
            {title}
          </p>
          <h3 className="text-3xl font-bold pfs-heading mt-3 tracking-tight">{value}</h3>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-[hsl(var(--pfs-cyan))]/10 border border-[hsl(var(--pfs-cyan))]/20">
          <span className="text-xs font-bold pfs-cyan flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {trend}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs pfs-muted leading-relaxed">{description}</p>
    </div>
  );
}

export function DecisionIntelligence() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      {/* Top Scores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ScoreCard title="Innovation Score" value="94/100" icon={Lightbulb} trend="+12%" description="Highly novel approach in an emerging tech sector. Low overlap with existing prior art." />
        <ScoreCard title="Patent Strength" value="A-" icon={ShieldAlert} trend="Stable" description="Broad independent claims possible. Dependent claims provide strong fallback positions." />
        <ScoreCard title="Portfolio Impact" value="High" icon={Briefcase} trend="+8%" description="Fills a critical gap in the current enterprise portfolio strategy." />
        <ScoreCard title="Market Readiness" value="78%" icon={Target} trend="+5%" description="Commercial implementation is feasible within 12-18 months based on current R&D." />
      </div>

      {/* Charts Row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg pfs-panel p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold pfs-heading flex items-center gap-2">
                <Activity className="h-4 w-4 pfs-cyan" />
                Technology Trend
              </h3>
              <p className="text-xs pfs-muted mt-1">Filing and citation momentum in this CPC class</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCitations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--pfs-cyan))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--pfs-cyan))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="citations" stroke="hsl(var(--pfs-cyan))" strokeWidth={2} fillOpacity={1} fill="url(#colorCitations)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg pfs-panel p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold pfs-heading flex items-center gap-2">
                <PieChart className="h-4 w-4 pfs-cyan" />
                Competitor Analysis
              </h3>
              <p className="text-xs pfs-muted mt-1">Threat overlap matrix across key technical subjects</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={competitorData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar name="Our Portfolio" dataKey="A" stroke="hsl(var(--pfs-cyan))" fill="hsl(var(--pfs-cyan))" fillOpacity={0.4} />
                <Radar name="Top Competitor" dataKey="B" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.4} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-5 lg:grid-cols-[1fr_350px]">
        {/* Executive Insights */}
        <div className="space-y-5">
          <div className="rounded-lg pfs-panel p-6 border-l-4 border-l-[hsl(var(--pfs-cyan))]">
            <h3 className="text-sm font-semibold pfs-heading flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 pfs-cyan" />
              Executive Insights & Business Recommendation
            </h3>
            <div className="space-y-4 text-sm leading-relaxed pfs-heading">
              <p>
                This invention demonstrates <strong>significant novelty</strong> in an area experiencing exponential patent filing growth (+214% YoY). The combination of ML edge-calibration with optical sensing establishes a strong defensive moat against primary competitors.
              </p>
              <div className="p-4 rounded-md bg-[hsl(var(--pfs-cyan))]/10 border border-[hsl(var(--pfs-cyan))]/20">
                <p className="font-semibold pfs-cyan mb-1 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Recommendation: Fast-Track Utility Filing
                </p>
                <p className="text-xs pfs-muted">
                  We recommend bypassing the provisional stage to file a non-provisional utility patent immediately with Track One prioritized examination. Competitors are actively bridging this white space.
                </p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg pfs-panel p-5">
            <h3 className="text-sm font-semibold pfs-heading mb-4">Core Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-md bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <p className="text-xs pfs-muted">CPC Class</p>
                <p className="text-sm font-bold mt-1">G06N 3/08</p>
              </div>
              <div className="p-3 rounded-md bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <p className="text-xs pfs-muted">Prior Art Hits</p>
                <p className="text-sm font-bold mt-1">12 References</p>
              </div>
              <div className="p-3 rounded-md bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <p className="text-xs pfs-muted">Prosecution Est.</p>
                <p className="text-sm font-bold mt-1">$14,500</p>
              </div>
              <div className="p-3 rounded-md bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                <p className="text-xs pfs-muted">Inventors</p>
                <p className="text-sm font-bold mt-1">2 Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg pfs-panel p-5">
          <h3 className="text-sm font-semibold pfs-heading flex items-center gap-2 mb-6">
            <Clock3 className="h-4 w-4 pfs-cyan" />
            Projected Timeline
          </h3>
          <div className="relative pl-3 space-y-6">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[hsl(var(--border))]" />
            {timelineData.map((item, i) => (
              <div key={i} className="relative pl-6">
                <div className={cn(
                  "absolute left-[-4px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[hsl(var(--card))]",
                  item.status === 'completed' ? "bg-[hsl(var(--pfs-cyan))]" :
                  item.status === 'current' ? "bg-[hsl(var(--pfs-cyan))] ring-[hsl(var(--pfs-cyan))]/20 animate-pulse" :
                  "bg-[hsl(var(--muted-foreground))]"
                )} />
                <p className="text-[10px] font-bold uppercase tracking-wider pfs-muted mb-1">{item.date}</p>
                <p className={cn(
                  "text-sm font-semibold",
                  item.status === 'upcoming' ? "text-[hsl(var(--muted-foreground))]" : "pfs-heading"
                )}>{item.title}</p>
                <p className="text-xs pfs-muted mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
