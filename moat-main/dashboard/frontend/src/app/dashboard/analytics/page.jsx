'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts'

// ─── Colour tokens ─────────────────────────────────────────────────────────────
const COMPETITOR_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
const COMPANY_NAMES     = ['Google', 'Apple', 'Samsung', 'Microsoft', 'IBM']

// ─── Mock data ──────────────────────────────────────────────────────────────────
const velocityData = [
  { year: '2019', Google: 98,  Apple: 62,  Samsung: 120, Microsoft: 77, IBM: 55 },
  { year: '2020', Google: 120, Apple: 80,  Samsung: 150, Microsoft: 90, IBM: 60 },
  { year: '2021', Google: 155, Apple: 95,  Samsung: 163, Microsoft: 110, IBM: 68 },
  { year: '2022', Google: 203, Apple: 114, Samsung: 191, Microsoft: 140, IBM: 75 },
  { year: '2023', Google: 228, Apple: 133, Samsung: 198, Microsoft: 175, IBM: 82 },
  { year: '2024', Google: 285, Apple: 182, Samsung: 215, Microsoft: 210, IBM: 90 },
]

const technologyData = [
  { name: 'AI / ML',          value: 34, fill: '#7c3aed' },
  { name: 'Semiconductors',   value: 22, fill: '#3b82f6' },
  { name: 'Clean Energy',     value: 18, fill: '#10b981' },
  { name: 'Biotechnology',    value: 14, fill: '#f59e0b' },
  { name: 'Quantum Computing',value: 12, fill: '#ef4444' },
]

const filingTrend = [
  { month: 'Jan', filings: 312 }, { month: 'Feb', filings: 291 },
  { month: 'Mar', filings: 388 }, { month: 'Apr', filings: 340 },
  { month: 'May', filings: 415 }, { month: 'Jun', filings: 462 },
  { month: 'Jul', filings: 398 }, { month: 'Aug', filings: 480 },
  { month: 'Sep', filings: 511 }, { month: 'Oct', filings: 467 },
  { month: 'Nov', filings: 529 }, { month: 'Dec', filings: 573 },
]

const topAssignees = [
  { name: 'Google LLC',       count: 4285, growth: '+12%' },
  { name: 'Samsung Electronics', count: 3920, growth: '+8%'  },
  { name: 'Apple Inc.',       count: 2870, growth: '+18%' },
  { name: 'Microsoft Corp.',  count: 2640, growth: '+22%' },
  { name: 'IBM Corp.',        count: 2310, growth: '+5%'  },
  { name: 'Qualcomm Inc.',    count: 1980, growth: '+14%' },
  { name: 'Intel Corp.',      count: 1755, growth: '-3%'  },
  { name: 'Meta Platforms',   count: 1420, growth: '+31%' },
]

// ─── Mini stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, accent }) {
  const positive = delta?.startsWith('+')
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 12, padding: '18px 22px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1 }}>{value}</p>
      {delta && (
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: positive ? '#16a34a' : '#dc2626',
          background: positive ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 4, padding: '2px 7px', alignSelf: 'flex-start'
        }}>{delta} vs last year</span>
      )}
    </div>
  )
}

// ─── Custom Pie active shape ─────────────────────────────────────────────────
function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props
  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--color-text-primary)" fontSize={15} fontWeight={700}>{payload.name}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={13}>{value}%</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 6} outerRadius={innerRadius - 2} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '3px 0 0' }}>{subtitle}</p>}
    </div>
  )
}

// ─── Chart card wrapper ──────────────────────────────────────────────────────
function ChartCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 12, padding: '20px 22px',
      ...style
    }}>
      {children}
    </div>
  )
}

// ─── Filter pill ─────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        border: `1px solid ${active ? '#7c3aed' : 'var(--color-border-tertiary)'}`,
        background: active ? '#7c3aed' : 'var(--color-background-primary)',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >{label}</button>
  )
}

// ─── Tooltip style ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
    }}>
      <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}: </span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [activePieIndex, setActivePieIndex] = useState(0)
  const [timeRange, setTimeRange] = useState('All')
  const [selectedCompetitors, setSelectedCompetitors] = useState(new Set(COMPANY_NAMES))

  const toggleCompetitor = (name) => {
    setSelectedCompetitors(prev => {
      const next = new Set(prev)
      if (next.has(name)) { if (next.size > 1) next.delete(name) }
      else next.add(name)
      return next
    })
  }

  const filteredVelocity = timeRange === 'All'
    ? velocityData
    : velocityData.slice(-parseInt(timeRange.replace('Y', '')))

  return (
    <div style={{
      padding: '24px 28px',
      overflowY: 'auto',
      height: '100%',
      background: 'var(--color-background-tertiary)',
    }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>📊</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            Patent Analytics
          </h1>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd'
          }}>LIVE</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Competitive landscape, filing velocity, and technology distribution — powered by the patent dataset.
        </p>
      </div>

      {/* KPI cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        <StatCard label="Total Patents Indexed"  value="10,248"  delta="+14%" />
        <StatCard label="Active Filings (2024)"   value="2,840"   delta="+22%" />
        <StatCard label="Unique Assignees"         value="1,326"   delta="+7%"  />
        <StatCard label="Avg. Citations / Patent"  value="8.4"     delta="+11%" />
        <StatCard label="Technology Domains"       value="47"      />
      </div>

      {/* Row 1: Competitor velocity + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16, alignItems: 'start' }}>

        {/* Competitor velocity chart */}
        <ChartCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <SectionHeader
              title="Competitor Filing Velocity"
              subtitle="Annual patent applications by top assignees"
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['3Y', '5Y', 'All'].map(r => (
                <FilterPill key={r} label={r} active={timeRange === r} onClick={() => setTimeRange(r)} />
              ))}
            </div>
          </div>

          {/* Competitor toggles */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {COMPANY_NAMES.map((name, i) => (
              <button
                key={name}
                onClick={() => toggleCompetitor(name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)',
                  background: selectedCompetitors.has(name) ? 'var(--color-background-secondary)' : 'transparent',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  color: selectedCompetitors.has(name) ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COMPETITOR_COLORS[i], opacity: selectedCompetitors.has(name) ? 1 : 0.3 }} />
                {name}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={filteredVelocity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {COMPANY_NAMES.map((name, i) => (
                  <linearGradient key={name} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COMPETITOR_COLORS[i]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COMPETITOR_COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {COMPANY_NAMES.map((name, i) =>
                selectedCompetitors.has(name) ? (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COMPETITOR_COLORS[i]}
                    strokeWidth={2}
                    fill={`url(#grad${i})`}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ) : null
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Technology distribution pie */}
        <ChartCard>
          <SectionHeader
            title="Technology Distribution"
            subtitle="Share by domain (2024)"
          />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={technologyData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={90}
                dataKey="value"
                activeIndex={activePieIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, i) => setActivePieIndex(i)}
              >
                {technologyData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {technologyData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>{d.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Monthly filings + Top assignees */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Monthly filing trend */}
        <ChartCard>
          <SectionHeader
            title="Monthly Filing Trend"
            subtitle="Patent applications filed — last 12 months"
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filingTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="filings" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top assignees table */}
        <ChartCard>
          <SectionHeader
            title="Top Assignees"
            subtitle="Ranked by total granted patents"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topAssignees.map((a, i) => {
              const maxCount = topAssignees[0].count
              const pct = Math.round((a.count / maxCount) * 100)
              const positive = a.growth.startsWith('+')
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0',
                    borderBottom: i < topAssignees.length - 1 ? '1px solid var(--color-border-tertiary)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 18, fontVariantNumeric: 'tabular-nums' }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                    </p>
                    <div style={{ height: 4, background: 'var(--color-background-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {a.count.toLocaleString()}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: positive ? '#16a34a' : '#dc2626',
                    minWidth: 36, textAlign: 'right'
                  }}>
                    {a.growth}
                  </span>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* Citation network placeholder */}
      <ChartCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionHeader
            title="Citation Network Graph"
            subtitle="Patent citation relationships — powered by Neo4j (Sprint 6)"
          />
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
            background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a'
          }}>Coming in Sprint 6</span>
        </div>

        {/* SVG mock network */}
        <div style={{ height: 200, background: 'var(--color-background-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            {/* Edges */}
            <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#7c3aed" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1="50%" y1="50%" x2="75%" y2="30%" stroke="#7c3aed" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1="50%" y1="50%" x2="30%" y2="75%" stroke="#3b82f6" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1="50%" y1="50%" x2="70%" y2="70%" stroke="#3b82f6" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1="25%" y1="25%" x2="10%" y2="40%" stroke="#10b981" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 3" />
            <line x1="75%" y1="30%" x2="88%" y2="20%" stroke="#10b981" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 3" />
            {/* Nodes */}
            <circle cx="50%" cy="50%" r="22" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeWidth="1.5" />
            <circle cx="25%" cy="25%" r="16" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
            <circle cx="75%" cy="30%" r="14" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="30%" cy="75%" r="12" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="70%" cy="70%" r="10" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="1.5" />
            <circle cx="10%" cy="40%" r="8"  fill="#7c3aed" fillOpacity="0.1" stroke="#7c3aed" strokeWidth="1" />
            <circle cx="88%" cy="20%" r="8"  fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1" />
          </svg>
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
              Force-directed citation graph
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
              Will query Neo4j citation edges and render with D3.js force simulation
            </p>
          </div>
        </div>
      </ChartCard>

      <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 4 }}>
        Analytics are based on the 10,248 indexed patents. Live data requires a running database stack.
      </p>
    </div>
  )
}
