"use client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { motion } from "framer-motion";

const TIP = { backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--foreground)", fontSize: "11px" };

function ChartCard({ title, subtitle, children, delay = 0 }: { title: string; subtitle?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 180, damping: 22 }}
      className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5"
    >
      <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/60 mb-4">{subtitle}</p>}
      {children}
    </motion.div>
  );
}

export function PatentCharts({
  statusData, trendData, monthlyData, radarData, growthData,
}: {
  statusData: { name: string; value: number; color: string }[];
  trendData: { year: string; filed: number; approved: number }[];
  monthlyData: { month: string; count: number }[];
  radarData: { subject: string; A: number }[];
  growthData: { date: string; growth: number }[];
}) {
  return (
    <div className="space-y-4">
      {/* Row 1: Pie + Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Project Status Mix" subtitle="Live counts from database" delay={0.1}>
          <div className="h-48">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {statusData.map(e => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TIP} formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground/60 text-center pt-12">No data</p>}
          </div>
        </ChartCard>

        <ChartCard title="Patent Filing Trend" subtitle="Projects by year" delay={0.15}>
          <div className="h-48">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="year" stroke="var(--muted-foreground)" opacity={0.6} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" opacity={0.6} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TIP} />
                  <Area type="monotone" dataKey="filed" stroke="#c9a84c" fill="url(#gA)" strokeWidth={2} name="Added" />
                  <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#gB)" strokeWidth={2} name="Approved" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground/60 text-center pt-12">No data</p>}
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Bar + Line */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChartCard title="Monthly Innovation" subtitle={`Ideas in ${new Date().getFullYear()}`} delay={0.2}>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" opacity={0.6} fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" opacity={0.6} fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="count" name="Ideas" radius={[4,4,0,0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${43 + i * 3}, ${58 - i}%, ${44 + i * 1.5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Portfolio Growth" subtitle="Cumulative projects over time" delay={0.25}>
          <div className="h-44">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" opacity={0.6} fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" opacity={0.6} fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TIP} />
                  <Line type="monotone" dataKey="growth" stroke="#10b981" strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground/60 text-center pt-12">No data</p>}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Radar full width */}
      {radarData.length > 0 && (
        <ChartCard title="Technology Distribution" subtitle="Patent tag density across fields" delay={0.3}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--muted-foreground)" opacity={0.8} fontSize={10} />
                <Radar name="Count" dataKey="A" stroke="#c9a84c" fill="#c9a84c" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={TIP} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
