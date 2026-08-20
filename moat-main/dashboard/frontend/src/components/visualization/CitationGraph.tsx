"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CitationGraphResponse } from "@/services/visualizationService";

interface CitationGraphProps {
  data?: CitationGraphResponse;
  isLoading: boolean;
}

export function CitationGraph({ data, isLoading }: CitationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 500;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation(data.nodes.map(n => ({ ...n } as any)))
      .force("link", d3.forceLink(data.links.map(l => ({ ...l } as any)))
        .id((d: any) => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const links = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#888")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1);

    const nodes = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
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
      );

    nodes.append("circle")
      .attr("r", (d: any) => Math.max(5, Math.min(15, (d.citation_count || 0) + 5)))
      .attr("fill", (d: any) => d.group === "center" ? "#2563eb" : "#6b7280")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    nodes.append("text")
      .text((d: any) => d.patent_number || d.id.slice(0, 8))
      .attr("x", 10)
      .attr("y", 3)
      .attr("font-size", "9px")
      .attr("fill", "#888");

    nodes.append("title")
      .text((d: any) => `${d.patent_number || ""}\n${d.title || ""}\n${d.assignee || ""}`);

    simulation.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      nodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Citation Graph</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Citation Graph</CardTitle></CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No citation graph data available. Sync patents to Neo4j to enable graph visualization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Citation Graph — {data.nodes.length} nodes, {data.links.length} links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg ref={svgRef} className="w-full" style={{ minHeight: "400px" }} />
      </CardContent>
    </Card>
  );
}
