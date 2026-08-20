"use client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const VIOLET = ["#c9a84c", "#e8c97a", "#8a6a1e", "#b8921e", "#f0d898", "#6b5015"];
const tickStyle = { fontSize: 11, fill: "#4b5563" };
const gridStyle = { stroke: "rgba(255,255,255,0.04)", strokeDasharray: "3 3" };
const tooltipStyle = {
  background: "#0f0f1a",
  border: "1px solid rgba(201,168,76,0.2)",
  borderRadius: 10,
  fontSize: 12,
  color: "#e2e8f0",
};

const growthData = [
  {month:"Jan",patents:1200,new:145},{month:"Feb",patents:1380,new:180},
  {month:"Mar",patents:1520,new:140},{month:"Apr",patents:1710,new:190},
  {month:"May",patents:1890,new:180},{month:"Jun",patents:2050,new:160},
  {month:"Jul",patents:2240,new:190},{month:"Aug",patents:2410,new:170},
  {month:"Sep",patents:2620,new:210},{month:"Oct",patents:2830,new:210},
  {month:"Nov",patents:3010,new:180},{month:"Dec",patents:3200,new:190},
];

export function PatentGrowthChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={growthData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8c97a" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#e8c97a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600, color: "#c9a84c" }} />
          <Area type="monotone" dataKey="patents" stroke="#c9a84c" strokeWidth={2} fill="url(#violetGrad)" name="Total Patents" dot={false} />
          <Area type="monotone" dataKey="new" stroke="#e8c97a" strokeWidth={1.5} fill="url(#indigoGrad)" strokeDasharray="5 3" name="New This Month" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const techData = [
  { tech: "AI/ML", count: 892 }, { tech: "Biotech", count: 645 },
  { tech: "Semicon", count: 521 }, { tech: "Energy", count: 410 },
  { tech: "Robotics", count: 387 }, { tech: "Pharma", count: 312 },
];

export function TechTrendsChart() {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={techData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <XAxis dataKey="tech" tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(201,168,76,0.05)" }} />
          <Bar dataKey="count" name="Patents" radius={[6, 6, 0, 0]}>
            {techData.map((_, i) => (
              <Cell key={i} fill={VIOLET[i % VIOLET.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const assigneeData = [
  { name: "Samsung", value: 420 }, { name: "IBM", value: 385 },
  { name: "Apple", value: 310 }, { name: "Microsoft", value: 275 },
  { name: "Google", value: 260 }, { name: "Others", value: 450 },
];

export function TopAssigneesChart() {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={assigneeData}
            cx="50%" cy="50%"
            innerRadius={52} outerRadius={78}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {assigneeData.map((_, i) => (
              <Cell key={i} fill={VIOLET[i % VIOLET.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            iconType="circle" iconSize={7}
            formatter={v => <span style={{ fontSize: 10, color: "#6b7280" }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const searchActivity = [
  { day: "Mon", searches: 24 }, { day: "Tue", searches: 38 },
  { day: "Wed", searches: 31 }, { day: "Thu", searches: 45 },
  { day: "Fri", searches: 52 }, { day: "Sat", searches: 18 }, { day: "Sun", searches: 12 },
];

export function SearchActivityChart() {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={searchActivity} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(201,168,76,0.05)" }} />
          <Bar dataKey="searches" name="Searches" fill="#c9a84c" radius={[5, 5, 0, 0]} fillOpacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
