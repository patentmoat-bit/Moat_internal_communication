import type { DashboardConfig, InsightDef } from "./dashboardEngine";

// ── CEO ────────────────────────────────────────────────────────────────────────
export const CEO_DASHBOARD: DashboardConfig = {
  role: "ceo", title: "Executive Intelligence", subtitle: "Business value of innovation across portfolio, licensing and competitive landscape.", badge: "CEO Workspace",
  kpis: [
    { id:"k1", type:"kpi", title:"Innovation ROI", value:"320%", trend:"+12.4%", trendDirection:"up", description:"YoY Return on R&D Spend", accentColor:"gold", sparkline:[210,240,255,270,295,320] },
    { id:"k2", type:"kpi", title:"Portfolio Value", value:"$84.2M", trend:"+5.4%", trendDirection:"up", description:"Estimated Intangible Asset Value", href:"/dashboard/ceo/portfolio", accentColor:"emerald", sparkline:[70,74,77,79,81,84] },
    { id:"k3", type:"kpi", title:"Licensing Revenue", value:"$12.4M", trend:"+18%", trendDirection:"up", description:"Active Licensing Agreements", accentColor:"blue", sparkline:[7,8,9,10,11,12] },
    { id:"k4", type:"kpi", title:"Competitor Risk", value:"Moderate", trend:"-2.1%", trendDirection:"down", description:"Prior Art Collision Exposure", accentColor:"rose" },
  ],
  trends: [
    { id:"t1", type:"trend", title:"Filings This Quarter", value:42, delta:"+14", deltaDirection:"up", sparkline:[18,22,28,31,38,42], unit:"patents" },
    { id:"t2", type:"trend", title:"Active Licensing Deals", value:18, delta:"+3", deltaDirection:"up", sparkline:[12,13,14,15,16,18] },
  ],
  charts: [
    { id:"c1", type:"chart", chartType:"area", title:"Innovation Growth Velocity", subtitle:"Patents vs Trade Secrets 2024", colSpan:2,
      data:[{name:"Jan",Patents:12,TradeSecrets:4},{name:"Feb",Patents:15,TradeSecrets:5},{name:"Mar",Patents:18,TradeSecrets:6},{name:"Apr",Patents:24,TradeSecrets:8},{name:"May",Patents:30,TradeSecrets:12},{name:"Jun",Patents:42,TradeSecrets:15}] },
    { id:"c2", type:"chart", chartType:"bar", title:"Competitor Threat Score", subtitle:"AI-scored threat by company",
      data:[{name:"Acme Corp",value:85},{name:"Globex",value:62},{name:"Initech",value:45},{name:"Soylent",value:30},{name:"Massive Dyn.",value:15}] },
    { id:"c3", type:"chart", chartType:"line", title:"Licensing Revenue Trend", subtitle:"Monthly revenue from IP licensing",
      data:[{name:"Jan",Revenue:820},{name:"Feb",Revenue:950},{name:"Mar",Revenue:880},{name:"Apr",Revenue:1020},{name:"May",Revenue:1150},{name:"Jun",Revenue:1240}] },
  ],
  gauges: [
    { id:"g1", type:"gauge", title:"Portfolio Strength", value:82, label:"82 / 100", description:"Composite IP portfolio defensibility score" },
    { id:"g2", type:"gauge", title:"Licensing Readiness", value:74, label:"74%", description:"Portfolio ready for commercial licensing" },
  ],
  tables: [
    { id:"tb1", type:"table", title:"Top Competitor Threats", subtitle:"Ranked by threat score", colSpan:2,
      columns:[{key:"name",label:"Company",type:"text"},{key:"threat",label:"Threat Score",type:"bar"},{key:"filings",label:"Filings (YTD)",type:"number"},{key:"overlap",label:"Claim Overlap",type:"badge"}],
      rows:[{name:"Acme Corp",threat:85,filings:312,overlap:"High"},{name:"Globex LLC",threat:62,filings:240,overlap:"Medium"},{name:"Initech",threat:45,filings:180,overlap:"Low"},{name:"Soylent Inc.",threat:30,filings:95,overlap:"Low"},{name:"Massive Dynamics",threat:15,filings:44,overlap:"None"}] },
  ],
  insights: [
    { id:"i1", category:"alert", severity:"critical", title:"Acme Corp Claim Collision", description:"Acme filed 3 patents overlapping our Core AI Routing engine. FTO analysis required immediately.", cta:"Run FTO", ctaHref:"/dashboard/risk" },
    { id:"i2", category:"opportunity", severity:"high", title:"Licensing Opportunity: Globex", description:"Globex is utilizing technology similar to our expired '882 family. Outbound licensing possible.", cta:"View Portfolio", ctaHref:"/dashboard/ceo/portfolio" },
    { id:"i3", category:"opportunity", severity:"medium", title:"White Space: Quantum Encryption", description:"Low patent density globally but high projected market value. First-mover advantage window open." },
    { id:"i4", category:"action", severity:"low", title:"Accelerate Neural Routing Filing", description:"Provisional filing recommended before Acme Corp gains priority date.", cta:"Open Workspace", ctaHref:"/dashboard/workspace/invention" },
  ],
  quickActions:[{label:"Portfolio",href:"/dashboard/ceo/portfolio"},{label:"My MOAT",href:"/dashboard/ceo/moat"},{label:"Landscape",href:"/dashboard/landscape"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── CTO ────────────────────────────────────────────────────────────────────────
export const CTO_DASHBOARD: DashboardConfig = {
  role:"cto", title:"Engineering Signal Intelligence", subtitle:"Technical invention discovery across repositories, architectures and engineering teams.", badge:"CTO Workspace",
  kpis:[
    { id:"k1", type:"kpi", title:"Engineering Signals", value:124, trend:"+24", trendDirection:"up", description:"Potential inventions detected in Git", accentColor:"gold", sparkline:[80,90,95,105,115,124] },
    { id:"k2", type:"kpi", title:"Architecture Novelty", value:"88%", trend:"+4.2%", trendDirection:"up", description:"Unique structural components globally", accentColor:"emerald", sparkline:[82,83,84,85,87,88] },
    { id:"k3", type:"kpi", title:"Repo Coverage", value:"92%", trend:"Stable", trendDirection:"flat", description:"Git repos monitored by AI", accentColor:"blue", sparkline:[91,92,92,91,92,92] },
    { id:"k4", type:"kpi", title:"Draft Conversion", value:"34%", trend:"+5%", trendDirection:"up", description:"Signals converted to disclosures", accentColor:"violet", sparkline:[25,27,29,30,32,34] },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Signals This Week", value:31, delta:"+7", deltaDirection:"up", sparkline:[12,15,18,22,24,31] },
    { id:"t2", type:"trend", title:"Drafts In Progress", value:14, delta:"+3", deltaDirection:"up", sparkline:[8,9,10,11,12,14] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"radar", title:"Innovation Clusters", subtitle:"Technology strength by domain",
      data:[{subject:"Distributed AI",A:140,fullMark:150},{subject:"Edge Cloud",A:120,fullMark:150},{subject:"Zero Trust",A:86,fullMark:150},{subject:"Vector Data",A:130,fullMark:150},{subject:"UX Frameworks",A:65,fullMark:150},{subject:"IoT Sensors",A:45,fullMark:150}] },
    { id:"c2", type:"chart", chartType:"line", title:"Novelty Detection Rate", subtitle:"Weekly signals processed",
      data:[{name:"W1",value:5},{name:"W2",value:8},{name:"W3",value:15},{name:"W4",value:12},{name:"W5",value:24},{name:"W6",value:31}] },
    { id:"c3", type:"chart", chartType:"bar", title:"Signals by Engineering Team", subtitle:"Inventions detected per team",
      data:[{name:"Team Alpha",value:42},{name:"Team Beta",value:31},{name:"Team Gamma",value:24},{name:"Platform",value:18},{name:"Mobile",value:9}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"Technical Defensibility", value:76, label:"76 / 100", description:"Architectural uniqueness vs. global prior art" },
    { id:"g2", type:"gauge", title:"Signal-to-Disclosure Rate", value:34, label:"34%", description:"Percentage of signals that become filings", thresholds:{good:50,warn:25} },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Top Inventive Teams", subtitle:"Ranked by signals produced", colSpan:2,
      columns:[{key:"team",label:"Team",type:"text"},{key:"signals",label:"Signals",type:"bar"},{key:"novelty",label:"Avg Novelty",type:"number"},{key:"status",label:"Status",type:"badge"}],
      rows:[{team:"Team Alpha",signals:42,novelty:91,status:"Active"},{team:"Team Beta",signals:31,novelty:87,status:"Active"},{team:"Team Gamma",signals:24,novelty:82,status:"Review"},{team:"Platform Eng.",signals:18,novelty:78,status:"Active"},{team:"Mobile",signals:9,novelty:65,status:"Low"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"critical", title:"Hidden Invention: Distributed Vector Caching", description:"Team Alpha's PR scores 95% novelty. No provisional filed. Disclosure window closing.", cta:"Create Disclosure", ctaHref:"/dashboard/workspace/invention" },
    { id:"i2", category:"alert", severity:"high", title:"Architecture Drift: Edge Cloud", description:"Significant drift towards Edge Cloud detected in latest sprint. IP capture needed.", cta:"Run Analysis", ctaHref:"/dashboard/novelty" },
    { id:"i3", category:"opportunity", severity:"medium", title:"Zero Trust Novelty Window", description:"Internal Zero Trust architecture scores 86/100 novelty. Market filing window open 6 months." },
    { id:"i4", category:"action", severity:"low", title:"Archive Legacy-Auth Monitoring", description:"Repository has 0 signals in 12 months. Redirect compute to active clusters." },
  ],
  quickActions:[{label:"Invention Workspace",href:"/dashboard/workspace/invention"},{label:"Semantic Search",href:"/dashboard/semantic-search"},{label:"Knowledge Graph",href:"/dashboard/visualization"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── CIO ────────────────────────────────────────────────────────────────────────
export const CIO_DASHBOARD: DashboardConfig = {
  role:"cio", title:"Enterprise Innovation Intelligence", subtitle:"Technology adoption, cross-team collaboration and AI transformation across the enterprise.", badge:"CIO Workspace",
  kpis:[
    { id:"k1", type:"kpi", title:"AI Transformation", value:"A-", trend:"+1 grade", trendDirection:"up", description:"Enterprise AI adoption index", accentColor:"gold", sparkline:[60,65,68,72,76,80] },
    { id:"k2", type:"kpi", title:"Tech Debt Risk", value:"12%", trend:"-3%", trendDirection:"down", description:"Legacy system dependency rate", accentColor:"emerald", sparkline:[20,18,17,15,14,12] },
    { id:"k3", type:"kpi", title:"Active Projects", value:45, trend:"+8", trendDirection:"up", description:"Initiatives tracked enterprise-wide", accentColor:"blue", sparkline:[30,33,36,38,42,45] },
    { id:"k4", type:"kpi", title:"Cross-Team Collab", value:"78%", trend:"+12%", trendDirection:"up", description:"Projects with multi-department teams", accentColor:"violet", sparkline:[60,64,68,72,75,78] },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Innovation Events This Quarter", value:284, delta:"+62", deltaDirection:"up", sparkline:[150,180,200,225,260,284] },
    { id:"t2", type:"trend", title:"Departments Innovating", value:11, delta:"+2", deltaDirection:"up", sparkline:[7,8,9,9,10,11] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"area", title:"Enterprise Innovation Map", subtitle:"Output by department per quarter", colSpan:2,
      data:[{name:"Q1",Engineering:40,Research:24,Product:15},{name:"Q2",Engineering:45,Research:30,Product:20},{name:"Q3",Engineering:60,Research:45,Product:35},{name:"Q4",Engineering:85,Research:60,Product:50}] },
    { id:"c2", type:"chart", chartType:"bar", title:"Technology Adoption by Department", subtitle:"AI and platform tool adoption score",
      data:[{name:"Data Eng",value:95},{name:"Core Platform",value:85},{name:"Mobile",value:65},{name:"Marketing IT",value:30},{name:"Finance IT",value:45}] },
    { id:"c3", type:"chart", chartType:"line", title:"AI Transformation Index (Monthly)", subtitle:"Enterprise-wide AI maturity score",
      data:[{name:"Jan",Score:55},{name:"Feb",Score:58},{name:"Mar",Score:61},{name:"Apr",Score:65},{name:"May",Score:70},{name:"Jun",Score:76}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"AI Adoption Index", value:68, label:"68 / 100", description:"Composite enterprise AI maturity" },
    { id:"g2", type:"gauge", title:"Cross-Team Innovation Rate", value:78, label:"78%", description:"Projects with multi-department contributors" },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Department Innovation Ranking", subtitle:"Scored by output, adoption and collaboration", colSpan:2,
      columns:[{key:"dept",label:"Department",type:"text"},{key:"score",label:"Innovation Score",type:"bar"},{key:"projects",label:"Projects",type:"number"},{key:"ai",label:"AI Adopted",type:"badge"}],
      rows:[{dept:"Data Engineering",score:95,projects:18,ai:"Yes"},{dept:"Core Platform",score:85,projects:14,ai:"Yes"},{dept:"Product",score:72,projects:11,ai:"Partial"},{dept:"Finance IT",score:45,projects:6,ai:"No"},{dept:"Marketing IT",score:30,projects:3,ai:"No"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"high", title:"Marketing IT Innovation Gap", description:"0 technical disclosures and lowest AI adoption score this quarter.", cta:"View Report", ctaHref:"/dashboard/reports" },
    { id:"i2", category:"alert", severity:"medium", title:"CI/CD Bottleneck Slowing IP Capture", description:"Legacy pipelines adding 14-day delay to patentable deployments on average." },
    { id:"i3", category:"opportunity", severity:"medium", title:"Scale Internal RAG Tool", description:"High engineering usage pattern. Recommending enterprise-wide rollout for 3x productivity gain." },
    { id:"i4", category:"action", severity:"low", title:"Upgrade Marketing IT AI Tooling", description:"Audit workflows for automation upgrades to close the 65-point innovation gap.", cta:"Start Audit", ctaHref:"/dashboard/analytics" },
  ],
  quickActions:[{label:"Analytics",href:"/dashboard/analytics"},{label:"Competitor",href:"/dashboard/competitor"},{label:"Neo4j Viz",href:"/dashboard/visualization"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── Admin ──────────────────────────────────────────────────────────────────────
export const ADMIN_DASHBOARD: DashboardConfig = {
  role:"admin", title:"Enterprise Control Plane", subtitle:"User management, permissions, security audit and full platform health monitoring.", badge:"Admin",
  kpis:[
    { id:"k1", type:"kpi", title:"Active Users", value:142, trend:"+12", trendDirection:"up", description:"Authenticated sessions this week", accentColor:"gold", sparkline:[110,118,124,130,136,142] },
    { id:"k2", type:"kpi", title:"Permission Drift", value:3, trend:"-2", trendDirection:"down", description:"Roles with misconfigured permissions", accentColor:"rose", sparkline:[8,7,6,5,4,3] },
    { id:"k3", type:"kpi", title:"Audit Events", value:"1,840", trend:"+320", trendDirection:"up", description:"Logged security events this month", accentColor:"blue", sparkline:[1200,1350,1480,1600,1720,1840] },
    { id:"k4", type:"kpi", title:"System Health", value:"99.4%", trend:"Stable", trendDirection:"flat", description:"Platform uptime SLA", accentColor:"emerald", sparkline:[99,99,99,99,99,99] },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Logins Today", value:87, delta:"+14", deltaDirection:"up", sparkline:[40,52,61,68,76,87] },
    { id:"t2", type:"trend", title:"API Calls (1h)", value:4280, delta:"+340", deltaDirection:"up", sparkline:[2800,3100,3400,3700,3980,4280] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"area", title:"User Activity (30 Days)", subtitle:"Logins and searches over time", colSpan:2,
      data:[{name:"W1",Logins:120,Searches:340},{name:"W2",Logins:145,Searches:410},{name:"W3",Logins:132,Searches:380},{name:"W4",Logins:158,Searches:450}] },
    { id:"c2", type:"chart", chartType:"bar", title:"Role Distribution", subtitle:"Users per enterprise role",
      data:[{name:"Analyst",value:64},{name:"Research Lead",value:28},{name:"Product Mgr",value:18},{name:"CTO",value:5},{name:"CEO",value:3},{name:"Admin",value:4}] },
    { id:"c3", type:"chart", chartType:"line", title:"Audit Events (Daily)", subtitle:"Security event volume",
      data:[{name:"Mon",value:210},{name:"Tue",value:280},{name:"Wed",value:340},{name:"Thu",value:295},{name:"Fri",value:380},{name:"Sat",value:190},{name:"Sun",value:145}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"System Health", value:99, label:"99.4%", description:"Platform uptime over the past 30 days" },
    { id:"g2", type:"gauge", title:"Security Score", value:87, label:"87 / 100", description:"Composite platform security posture" },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Recent Security Events", subtitle:"Flagged audit log entries", colSpan:2,
      columns:[{key:"event",label:"Event",type:"text"},{key:"user",label:"User",type:"text"},{key:"severity",label:"Severity",type:"badge"},{key:"time",label:"Time",type:"text"}],
      rows:[{event:"Permission Escalation",user:"analyst_07",severity:"High",time:"2m ago"},{event:"Failed Login (x14)",user:"unknown",severity:"High",time:"18m ago"},{event:"Role Drift Detected",user:"pm_03",severity:"Medium",time:"1h ago"},{event:"Config Export",user:"admin_01",severity:"Low",time:"3h ago"},{event:"API Key Rotation",user:"admin_02",severity:"Info",time:"6h ago"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"critical", title:"Permission Drift: 3 Analyst Accounts", description:"Elevated access beyond role definition detected. Immediate review required.", cta:"Review RBAC", ctaHref:"/dashboard/security" },
    { id:"i2", category:"alert", severity:"high", title:"Failed Login Spike: IP 192.168.4.22", description:"14 failed attempts in the past hour. Rate-limiting or block recommended." },
    { id:"i3", category:"action", severity:"medium", title:"Archive Q1 Audit Logs", description:"Log volume trending +35% MoM. Archiving Q1 records will free storage and improve query speed.", cta:"Manage Logs", ctaHref:"/dashboard/security" },
    { id:"i4", category:"action", severity:"low", title:"Schedule Quarterly Permission Audit", description:"Export RBAC matrix for compliance review before end of quarter." },
  ],
  quickActions:[{label:"Security",href:"/dashboard/security"},{label:"Authentication",href:"/dashboard/authentication"},{label:"Settings",href:"/dashboard/settings"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── Patent Counsel (Legal) ─────────────────────────────────────────────────────────
export const LEGAL_DASHBOARD: DashboardConfig = {
  role:"patent_counsel", title:"Prior Art & Filing Intelligence", subtitle:"Statutory criteria compliance, citation analysis and claim tracking.", badge:"Legal Workspace",
  kpis:[
    { id:"k1", type:"kpi", title:"Filing Risk", value:"Moderate", trend:"Stable", trendDirection:"flat", description:"Average 103 obviousness risk", accentColor:"blue", sparkline:[45,46,45,44,45,45] },
    { id:"k2", type:"kpi", title:"Patentability Index", value:"76/100", trend:"+12", trendDirection:"up", description:"Statutory criteria compliance", accentColor:"emerald", sparkline:[64,68,70,72,74,76] },
    { id:"k3", type:"kpi", title:"Pending Drafts", value:14, trend:"+3", trendDirection:"up", description:"Awaiting attorney review", accentColor:"gold", sparkline:[8,9,11,11,12,14] },
    { id:"k4", type:"kpi", title:"Citation Risk", value:"Low", trend:"-5%", trendDirection:"down", description:"Likelihood of examiner rejection", accentColor:"rose" },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Prior Art Matches", value:8, delta:"+2", deltaDirection:"up", sparkline:[4,5,6,6,7,8] },
    { id:"t2", type:"trend", title:"Weekly Filings", value:3, delta:"+1", deltaDirection:"up", sparkline:[1,2,2,3,2,3] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"bar", title:"Prior Art Risk Density", subtitle:"Risk categories per claim set", colSpan:1,
      data:[{name:"101 Risk",value:5},{name:"102 Risk",value:14},{name:"103 Risk",value:34},{name:"112 Risk",value:8}] },
    { id:"c2", type:"chart", chartType:"line", title:"Draft Completion Velocity", subtitle:"Daily drafts finalized", colSpan:1,
      data:[{name:"Mon",value:2},{name:"Tue",value:5},{name:"Wed",value:4},{name:"Thu",value:8},{name:"Fri",value:11}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"Patentability Score", value:76, label:"76 / 100", description:"Composite compliance score" },
    { id:"g2", type:"gauge", title:"Filing Readiness", value:92, label:"92%", description:"Draft sets cleared for USPTO submit" },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Pending Patent Drafts", subtitle:"Queue status", colSpan:2,
      columns:[{key:"draft",label:"Draft",type:"text"},{key:"readiness",label:"Readiness Score",type:"bar"},{key:"priority",label:"Priority",type:"badge"},{key:"assignee",label:"Assignee",type:"text"}],
      rows:[{draft:"Draft #44 (Neural Routing)",readiness:85,priority:"High",assignee:"Acme Corp"},{draft:"Draft #32 (Auth Sync)",readiness:62,priority:"Medium",assignee:"Globex LLC"},{draft:"Draft #48 (Vector Comp)",readiness:92,priority:"High",assignee:"Initech"},{draft:"Draft #50 (Edge Cache)",readiness:30,priority:"Low",assignee:"Soylent Inc"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"critical", title:"Critical Claim Collision", description:"Draft #44 has 85% claim overlap with US Patent 10,234,444 (Google).", cta:"View Claims", ctaHref:"/dashboard/claim-intelligence" },
    { id:"i2", category:"alert", severity:"high", title:"Enablement Weakness", description:"Draft #32 lacks sufficient architectural detail for §112 written description.", cta:"Request Interview" },
    { id:"i3", category:"opportunity", severity:"medium", title:"Strong Novelty: Vector Compression", description:"Draft #48 cleared all prior art searches with 0 matches. Ready for provisional filing." },
  ],
  quickActions:[{label:"Patent Search",href:"/dashboard/search"},{label:"Claims",href:"/dashboard/claim-intelligence"},{label:"Patentability",href:"/dashboard/patentability"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── Research Lead ──────────────────────────────────────────────────────────────────
export const RESEARCH_DASHBOARD: DashboardConfig = {
  role:"research_lead", title:"Research-to-Patent Intelligence", subtitle:"Invention conversion from academic publications, patents, and laboratory reports.", badge:"Research Workspace",
  kpis:[
    { id:"k1", type:"kpi", title:"Conversion Rate", value:"18%", trend:"+2.5%", trendDirection:"up", description:"Publications to patent filings", accentColor:"gold", sparkline:[12,13,15,16,17,18] },
    { id:"k2", type:"kpi", title:"Commercial Potential", value:"High", trend:"Up", trendDirection:"up", description:"Market alignment score", accentColor:"emerald", sparkline:[60,65,70,75,80,85] },
    { id:"k3", type:"kpi", title:"Papers Scanned", value:452, trend:"+120", trendDirection:"up", description:"Publications analyzed by AI", accentColor:"blue", sparkline:[300,320,350,380,410,452] },
    { id:"k4", type:"kpi", title:"White Space Matches", value:6, trend:"+1", trendDirection:"up", description:"Research matching market gaps", accentColor:"violet" },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Monitored Papers", value:82, delta:"+15", deltaDirection:"up", sparkline:[50,55,60,65,72,82] },
    { id:"t2", type:"trend", title:"Active Inventions", value:12, delta:"+2", deltaDirection:"up", sparkline:[8,9,9,10,11,12] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"area", title:"Publication to Filing Trajectory", subtitle:"Monitored publications vs filings", colSpan:2,
      data:[{name:"2020",Publications:100,Filings:5},{name:"2021",Publications:120,Filings:10},{name:"2022",Publications:150,Filings:15},{name:"2023",Publications:200,Filings:25},{name:"2024",Publications:250,Filings:45}] },
    { id:"c2", type:"chart", chartType:"bar", title:"Domain Momentum", subtitle:"Research volume by sector", colSpan:1,
      data:[{name:"Polymers",value:85},{name:"Batteries",value:65},{name:"Solar",value:45},{name:"Graphene",value:20}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"Patent Readiness", value:85, label:"85%", description:"Avg readiness score of active designs" },
    { id:"g2", type:"gauge", title:"Research Conversion Rate", value:18, label:"18%", description:"Publications converted to IP disclosures" },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Research Innovation Pipelines", subtitle:"Publications pending filing review", colSpan:2,
      columns:[{key:"paper",label:"Research Paper",type:"text"},{key:"novelty",label:"Novelty Score",type:"bar"},{key:"commercial",label:"Market Value",type:"badge"},{key:"status",label:"Status",type:"text"}],
      rows:[{paper:"Solid-State Battery Anodes",novelty:92,commercial:"High",status:"Filing Prep"},{paper:"Graphene Superlattices",novelty:85,commercial:"Medium",status:"Review"},{paper:"Organic Photo-detectors",novelty:65,commercial:"Low",status:"Drafting"},{paper:"Quantum Dot Emitting Diodes",novelty:42,commercial:"Medium",status:"Queue"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"critical", title:"Premature Disclosure Risk", description:"Team Beta is submitting 'Paper X' to IEEE next month — no provisional filed yet.", cta:"Draft Provisional", ctaHref:"/dashboard/workspace/invention" },
    { id:"i2", category:"opportunity", severity:"high", title:"Commercial Breakthrough: Polymers", description:"Polymer experiment #44 aligns perfectly with current EV battery market demand.", cta:"View Landscape", ctaHref:"/dashboard/landscape" },
    { id:"i3", category:"action", severity:"medium", title:"Redirect Graphene Budget", description:"Graphene outputs dropped 40% YoY with declining patentability scores. Shift to Battery domain." },
  ],
  quickActions:[{label:"Invention Workspace",href:"/dashboard/workspace/invention"},{label:"Moat Engine",href:"/dashboard/novelty"},{label:"Landscape",href:"/dashboard/landscape"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── Product Manager ─────────────────────────────────────────────────────────────────
export const PRODUCT_DASHBOARD: DashboardConfig = {
  role:"product_manager", title:"Product & Feature Intelligence", subtitle:"Roadmap feature protection, competitor overlap checks, and UX/UI design patents.", badge:"Product Workspace",
  kpis:[
    { id:"k1", type:"kpi", title:"Feature Novelty", value:"89%", trend:"+5%", trendDirection:"up", description:"Unique design paradigms detected", accentColor:"emerald", sparkline:[78,80,82,84,87,89] },
    { id:"k2", type:"kpi", title:"Competitor Overlap", value:"42%", trend:"-2%", trendDirection:"down", description:"Feature alignment with rivals", accentColor:"rose", sparkline:[48,46,45,44,43,42] },
    { id:"k3", type:"kpi", title:"Product Risk", value:"Low", trend:"Stable", trendDirection:"flat", description:"Roadmap infringement exposure", accentColor:"blue" },
    { id:"k4", type:"kpi", title:"Design Patents", value:8, trend:"+2", trendDirection:"up", description:"UX interfaces protected", accentColor:"violet", sparkline:[4,5,5,6,7,8] },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Roadmap Features Checked", value:24, delta:"+6", deltaDirection:"up", sparkline:[12,14,16,18,20,24] },
    { id:"t2", type:"trend", title:"Active Alerts", value:5, delta:"+1", deltaDirection:"up", sparkline:[2,3,4,4,4,5] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"radar", title:"Competitive Product Mapping", subtitle:"Feature uniqueness comparison", colSpan:2,
      data:[{subject:"Checkout UX",A:120,fullMark:150},{subject:"Search Algorithm",A:98,fullMark:150},{subject:"Data Viz",A:140,fullMark:150},{subject:"Mobile Auth",A:70,fullMark:150},{subject:"Onboarding",A:85,fullMark:150}] },
    { id:"c2", type:"chart", chartType:"bar", title:"Feature Novelty Breakdown", subtitle:"Roadmap item scores", colSpan:1,
      data:[{name:"High Novelty",value:45},{name:"Medium Novelty",value:30},{name:"Commoditized",value:25}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"UX Innovation Index", value:89, label:"89%", description:"Uniqueness score of frontend layouts" },
    { id:"g2", type:"gauge", title:"FTO Clearance Grade", value:95, label:"95%", description:"Roadmap items cleared for release" },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Product Feature Protection", subtitle:"Filing and validation status", colSpan:2,
      columns:[{key:"feature",label:"Feature Name",type:"text"},{key:"novelty",label:"Novelty Score",type:"bar"},{key:"risk",label:"Infringement Risk",type:"badge"},{key:"action",label:"Filing Recommendation",type:"text"}],
      rows:[{feature:"Swipe-to-Pay Interface",novelty:94,risk:"Low",action:"Design Patent"},{feature:"Contextual Search Filters",novelty:82,risk:"Medium",action:"Utility Patent"},{feature:"AR Product Visualizer",novelty:88,risk:"High",action:"FTO Sweep Required"},{feature:"Single-Sign-On Auth",novelty:30,risk:"Low",action:"None"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"high", title:"Competitor Mimicry", description:"Competitor X launched a search filtering UI identical to our unpatented v3.2.", cta:"Compare Designs", ctaHref:"/dashboard/competitor" },
    { id:"i2", category:"alert", severity:"medium", title:"AR Onboarding FTO Needed", description:"AR Onboarding feature needs prior-art and FTO clearance before Q4 launch.", cta:"Run FTO Sweep", ctaHref:"/dashboard/risk" },
    { id:"i3", category:"opportunity", severity:"medium", title:"Design Patent Opportunity", description:"File a design patent immediately for the new v4.0 Swipe-to-Pay gesture." },
  ],
  quickActions:[{label:"Competitor",href:"/dashboard/competitor"},{label:"Alerts",href:"/dashboard/alerts"},{label:"Moat Engine",href:"/dashboard/novelty"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── Analyst ────────────────────────────────────────────────────────────────────────
export const ANALYST_DASHBOARD: DashboardConfig = {
  role:"analyst", title:"Patent Search & Landscape Intelligence", subtitle:"Advanced keyword, semantic, and citation search sweeps across international corpuses.", badge:"Analyst Workspace",
  kpis:[
    { id:"k1", type:"kpi", title:"Search Coverage", value:"97%", trend:"+2%", trendDirection:"up", description:"Prior art database index coverage", accentColor:"emerald", sparkline:[92,93,94,95,96,97] },
    { id:"k2", type:"kpi", title:"Open Alerts", value:8, trend:"-3", trendDirection:"down", description:"Active patent landscape watches", accentColor:"rose", sparkline:[14,13,11,10,9,8] },
    { id:"k3", type:"kpi", title:"Analyses Run", value:124, trend:"+24", trendDirection:"up", description:"Novelty & FTO analyses run", accentColor:"blue", sparkline:[80,90,95,105,115,124] },
    { id:"k4", type:"kpi", title:"Saved Results", value:342, trend:"+18", trendDirection:"up", description:"Saved patents and collection items", accentColor:"violet", sparkline:[310,318,324,330,336,342] },
  ],
  trends:[
    { id:"t1", type:"trend", title:"Weekly Searches", value:41, delta:"+6", deltaDirection:"up", sparkline:[20,25,30,28,35,41] },
    { id:"t2", type:"trend", title:"Monitored Collections", value:18, delta:"+2", deltaDirection:"up", sparkline:[12,14,15,16,16,18] },
  ],
  charts:[
    { id:"c1", type:"chart", chartType:"bar", title:"Patent Landscape Density", subtitle:"Filing volumes by CPC category", colSpan:2,
      data:[{name:"AI/ML",value:5240},{name:"Biotech",value:3180},{name:"Semiconductors",value:4200},{name:"Clean Energy",value:2100},{name:"Cybersecurity",value:1840}] },
    { id:"c2", type:"chart", chartType:"line", title:"Search Volume (Weekly)", subtitle:"Searches run in workspace", colSpan:1,
      data:[{name:"W1",value:12},{name:"W2",value:18},{name:"W3",value:26},{name:"W4",value:22},{name:"W5",value:35},{name:"W6",value:41}] },
  ],
  gauges:[
    { id:"g1", type:"gauge", title:"System Index Coverage", value:97, label:"97%", description:"Global database synchronization" },
    { id:"g2", type:"gauge", title:"Alert Precision", value:89, label:"89%", description:"Relevance rating of system alerts" },
  ],
  tables:[
    { id:"tb1", type:"table", title:"Recent Saved Searches", subtitle:"Active monitoring profiles", colSpan:2,
      columns:[{key:"query",label:"Search Term",type:"text"},{key:"matches",label:"New Matches",type:"number"},{key:"relevance",label:"Avg Relevance",type:"bar"},{key:"alerts",label:"Alert Mode",type:"badge"}],
      rows:[{query:"Distributed Tensor Processing",matches:14,relevance:92,alerts:"Daily"},{query:"Solid State Electrolytes",matches:8,relevance:85,alerts:"Weekly"},{query:"Visual Transformer Architectures",matches:22,relevance:78,alerts:"Real-time"},{query:"Zero Trust SSO Flow",matches:3,relevance:60,alerts:"None"}] },
  ],
  insights:[
    { id:"i1", category:"alert", severity:"critical", title:"Filing Alert: Clean Energy", description:"New filings from Tesla overlap with 3 monitored claims.", cta:"Compare Patents", ctaHref:"/dashboard/similarity" },
    { id:"i2", category:"alert", severity:"high", title:"High Density CPC: G06N", description:"AI/ML landscape CPC G06N has 5,240 patents — novelty searches require extra depth.", cta:"Launch Landscape", ctaHref:"/dashboard/landscape" },
    { id:"i3", category:"opportunity", severity:"medium", title:"High Similarity Match", description:"Patent US10,123,456 has 91% structural similarity to your saved reference document." },
  ],
  quickActions:[{label:"Patent Search",href:"/dashboard/search"},{label:"Semantic Search",href:"/dashboard/semantic-search"},{label:"Similarity",href:"/dashboard/similarity"},{label:"Landscape",href:"/dashboard/landscape"},{label:"Reports",href:"/dashboard/reports"}],
};

// ── Map ────────────────────────────────────────────────────────────────────────
const DASHBOARD_MAP: Record<string, DashboardConfig> = {
  ceo: CEO_DASHBOARD,
  cto: CTO_DASHBOARD,
  cio: CIO_DASHBOARD,
  admin: ADMIN_DASHBOARD,
  patent_counsel: LEGAL_DASHBOARD,
  legal: LEGAL_DASHBOARD,
  research_lead: RESEARCH_DASHBOARD,
  research: RESEARCH_DASHBOARD,
  product_manager: PRODUCT_DASHBOARD,
  product: PRODUCT_DASHBOARD,
  analyst: ANALYST_DASHBOARD,
};

export function getDashboardConfig(role: string): DashboardConfig | null {
  return DASHBOARD_MAP[role] ?? null;
}
