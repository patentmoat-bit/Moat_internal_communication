"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  Share2,
  Network,
  Milestone,
  TrendingUp,
  Search,
  Maximize2,
  Plus
} from "lucide-react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PatentDetailPanel } from "@/components/search/PatentDetailPanel";

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Cell,
  Pie
} from "recharts";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// -------------------------------------------------------------
// High-Fidelity Mock Visual Data (Generative based on saved patents)
// -------------------------------------------------------------
const defaultFilingTrends = [
  { year: 2015, volume: 12 },
  { year: 2016, volume: 19 },
  { year: 2017, volume: 27 },
  { year: 2018, volume: 43 },
  { year: 2019, volume: 56 },
  { year: 2020, volume: 82 },
  { year: 2021, volume: 114 },
  { year: 2022, volume: 148 },
  { year: 2023, volume: 195 },
  { year: 2024, volume: 240 }
];

const defaultAssignees = [
  { name: "Veritas Medical Labs", count: 48, fill: "#c9a84c" },
  { name: "Global Diagnostics", count: 32, fill: "#3b82f6" },
  { name: "MedTech Systems", count: 24, fill: "#10b981" },
  { name: "BioSignal Inc.", count: 18, fill: "#f59e0b" },
  { name: "HealthAI Corp", count: 15, fill: "#ec4899" }
];

const defaultIpcDistribution = [
  { name: "A61B (Diagnostics)", value: 42, color: "#c9a84c" },
  { name: "G16H (Healthcare IT)", value: 30, color: "#3b82f6" },
  { name: "G06N (Neural Networks)", value: 18, color: "#10b981" },
  { name: "H04L (Data Exchange)", value: 10, color: "#f59e0b" }
];

export default function VisualizationPage() {
  const { savedPatents } = useApp();

  const [activeTab, setActiveTab] = useState("network");
  const [selectedPatentId, setSelectedPatentId] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [activePatentDetails, setActivePatentDetails] = useState<any | null>(null);
  
  // D3 Svg Ref
  const svgRef = useRef<SVGSVGElement>(null);

  // Set initial selected patent if we have saved patents
  useEffect(() => {
    if (savedPatents.length > 0 && !selectedPatentId) {
      setSelectedPatentId(savedPatents[0].patentNumber);
      setSearchVal(savedPatents[0].patentNumber);
    } else if (!selectedPatentId) {
      setSelectedPatentId("US10987234B2"); // fallback
      setSearchVal("US10987234B2");
    }
  }, [savedPatents]);

  // D3 Citation Network Rendering
  useEffect(() => {
    if (activeTab !== "network" || !svgRef.current || !selectedPatentId) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 550;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const container = svg.append("g");

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Create Concentric Ring background lines
    const rings = [100, 200, 300];
    rings.forEach((r) => {
      container.append("circle")
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.08)
        .attr("stroke-dasharray", "4 4");

      container.append("text")
        .attr("x", width / 2 + r + 5)
        .attr("y", height / 2 - 5)
        .attr("fill", "currentColor")
        .attr("fill-opacity", 0.3)
        .attr("font-size", "9px")
        .attr("font-weight", "semibold")
        .text(r === 100 ? "Backward Citations" : r === 200 ? "Filing Group" : "Forward Citations");
    });

    // Generate dynamic nodes based on selected patent
    const targetPatent = savedPatents.find((p) => p.patentNumber === selectedPatentId) || {
      patentNumber: selectedPatentId,
      title: "Target Biosensor System",
      assignee: "Veritas Medical Labs"
    };

    // Nodes schema
    const nodes: any[] = [
      { id: targetPatent.patentNumber, title: targetPatent.title, assignee: targetPatent.assignee, group: "center", fx: width / 2, fy: height / 2 }
    ];
    const links: any[] = [];

    // Citations (backward citations)
    const assignees = ["Google LLC", "Apple Inc.", "Medtronic", "Roche Diagnostics", "Abbott Labs"];
    const colors = ["#c9a84c", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"];

    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6;
      const x = width / 2 + 100 * Math.cos(angle);
      const y = height / 2 + 100 * Math.sin(angle);
      const patId = `US98${102 + i}938B1`;
      
      nodes.push({
        id: patId,
        title: `Prior diagnostic methods in sensor calibration ${i}`,
        assignee: assignees[i % assignees.length],
        group: "backward",
        x,
        y
      });
      links.push({ source: patId, target: targetPatent.patentNumber });
    }

    // Forward Citations (outer ring)
    for (let i = 0; i < 8; i++) {
      const angle = (i * 2 * Math.PI) / 8 + 0.3;
      const x = width / 2 + 300 * Math.cos(angle);
      const y = height / 2 + 300 * Math.sin(angle);
      const patId = `US11${492 + i}115B2`;

      nodes.push({
        id: patId,
        title: `Derivative sensor processing application ${i}`,
        assignee: assignees[(i + 2) % assignees.length],
        group: "forward",
        x,
        y
      });
      links.push({ source: targetPatent.patentNumber, target: patId });
    }

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("collide", d3.forceCollide().radius(35));

    // Render Link lines
    const linkElems = container.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.15)
      .attr("stroke-width", 1.5);

    // Render node groups
    const nodeElems = container.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on("click", (event, d) => {
        // Open details panel on click
        setActivePatentDetails({
          id: d.id,
          patentNumber: d.id,
          title: d.title,
          assignee: d.assignee,
          date: "2022-04-12",
          abstract: `Abstract detail for patent ${d.id}. It details optical configurations, noise cancellation filters, and data regressions in medical environments.`,
          ipc: ["A61B 5/145", "G16H 40/60"]
        });
      });

    // Node circles
    nodeElems.append("circle")
      .attr("r", (d: any) => d.group === "center" ? 18 : 12)
      .attr("fill", (d: any) => {
        if (d.group === "center") return "#a855f7"; // purple primary
        const idx = assignees.indexOf(d.assignee);
        return colors[idx !== -1 ? idx : 0];
      })
      .attr("stroke", "rgba(255,255,255,0.8)")
      .attr("stroke-width", 2);

    // Label texts
    nodeElems.append("text")
      .attr("dy", ".31em")
      .attr("x", (d: any) => d.group === "center" ? 22 : 16)
      .attr("font-size", "10px")
      .attr("font-weight", "semibold")
      .attr("fill", "currentColor")
      .attr("fill-opacity", 0.9)
      .text((d: any) => d.id);

    // Tooltip titles
    nodeElems.append("title")
      .text((d: any) => `${d.id}\n${d.title}\nAssignee: ${d.assignee}`);

    // Simulation tick updates
    simulation.on("tick", () => {
      linkElems
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeElems.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [activeTab, selectedPatentId]);

  // Scatter plot data mapping
  const scatterData = [
    { x: 2015, y: 1, z: 24, name: "US10123456B2", assignee: "Veritas Medical Labs" },
    { x: 2016, y: 1, z: 42, name: "US10234567B2", assignee: "Global Diagnostics" },
    { x: 2017, y: 2, z: 12, name: "US10345678B2", assignee: "MedTech Systems" },
    { x: 2018, y: 3, z: 35, name: "US10456789B2", assignee: "BioSignal Inc." },
    { x: 2019, y: 1, z: 67, name: "US10567890B2", assignee: "Veritas Medical Labs" },
    { x: 2020, y: 4, z: 58, name: "US10678901B2", assignee: "Global Diagnostics" },
    { x: 2021, y: 2, z: 89, name: "US10789012B2", assignee: "MedTech Systems" },
    { x: 2022, y: 1, z: 110, name: "US10890123B2", assignee: "BioSignal Inc." },
    { x: 2023, y: 3, z: 147, name: "US10987234B2", assignee: "Veritas Medical Labs" },
    { x: 2024, y: 2, z: 23, name: "US11091234B2", assignee: "Global Diagnostics" }
  ];

  const ipcLabels = ["", "A61B (Diagnostics)", "G16H (Health IT)", "G06N (Neural Nets)", "H04L (Networks)"];

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" />
          Landscape Visualization
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Explore interactive citation rings, filing landscape grids, and dynamic market trend intelligence dashboards.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="network" className="gap-1.5 text-xs font-semibold">
            <Network className="h-3.5 w-3.5 text-[#c9a84c]" />
            Citation Network
          </TabsTrigger>
          <TabsTrigger value="landscape" className="gap-1.5 text-xs font-semibold">
            <Milestone className="h-3.5 w-3.5 text-blue-500" />
            Landscape Map
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5 text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Trend Analysis
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Citation Network */}
        <TabsContent value="network" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Network className="h-4 w-4 text-[#c9a84c]" />
                  Concentric Citation Rings
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Visualizing forward and backward citation degrees for selected patent nodes. Click node to open detail view.
                </CardDescription>
              </div>

              {/* Selector */}
              <div className="flex gap-2 w-72">
                <Input
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Enter patent ID (e.g. US10987234B2)"
                  className="h-8 text-xs font-medium"
                />
                <Button onClick={() => setSelectedPatentId(searchVal)} size="sm" className="h-8 text-xs font-semibold">
                  Update
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative flex justify-center bg-muted/10 p-1">
              <svg ref={svgRef} className="w-full bg-background/50 border rounded-lg" style={{ minHeight: "550px" }} />
              
              {/* Floating Legend */}
              <div className="absolute bottom-4 left-4 border bg-background/95 backdrop-blur shadow-sm p-3 rounded-lg text-[10px] space-y-1.5 font-semibold">
                <div className="text-muted-foreground uppercase text-[9px] border-b pb-1 mb-1">Node Assignee Map</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#c9a84c]" /> Veritas Medical Labs</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Google LLC</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Apple Inc.</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Medtronic</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pink-500" /> Roche Diagnostics</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Landscape Map */}
        <TabsContent value="landscape" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Milestone className="h-4 w-4 text-blue-500" />
                Filing Landscape Grid
              </CardTitle>
              <CardDescription className="text-[10px]">
                Scatter plot charting Filing Date (Timeline) vs. IPC Primary Classifications. Bubble size indicates citation weights.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 40 }}>
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Filing Year"
                      domain={[2014, 2025]}
                      tickCount={12}
                      tick={{ fontSize: 10, fontWeight: "600" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Classification"
                      domain={[0, 5]}
                      tickFormatter={(v) => ipcLabels[v] || ""}
                      tick={{ fontSize: 10, fontWeight: "600" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 400]} name="Citations" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ fontSize: 11, backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Scatter name="Filing Volumes" data={scatterData} fill="#3b82f6" opacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
 
        {/* Tab 3: Trend Analysis */}
        <TabsContent value="trends" className="space-y-6">
          {/* Trends Dashboard */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Area Chart: Filing timeline */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Filing Timeline Trends (10 Years)</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={defaultFilingTrends}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#c9a84c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: "600" }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: "600" }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="volume" stroke="#c9a84c" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
 
            {/* Bar Chart: Assignee Volume */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Filing Volumes by Assignee</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={defaultAssignees} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fontWeight: "600" }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fontWeight: "600" }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {defaultAssignees.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* IPC Pie Chart row */}
          <Card className="max-w-2xl mx-auto border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-center">IPC Core Classification Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={defaultIpcDistribution} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                      {defaultIpcDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs font-semibold">
                {defaultIpcDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-foreground">{item.name}:</span>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Detail panel on click from D3 node graph */}
      {activePatentDetails && (
        <PatentDetailPanel
          patent={activePatentDetails}
          onClose={() => setActivePatentDetails(null)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
