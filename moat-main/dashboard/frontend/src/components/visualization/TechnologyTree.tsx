"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TechnologyTreeResponse } from "@/services/visualizationService";

interface TechnologyTreeProps {
  data?: TechnologyTreeResponse;
  isLoading: boolean;
}

export function TechnologyTree({ data, isLoading }: TechnologyTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 500;

    const root = d3.hierarchy(data.root).sum((d: any) => d.value || 1);
    const treemap = d3.treemap().size([width, height]).padding(2);
    treemap(root as any);

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const leaf = svg.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    leaf.append("rect")
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("fill", (d: any, i: number) => color(i + ""))
      .attr("opacity", 0.7);

    leaf.append("text")
      .attr("x", 4)
      .attr("y", 14)
      .attr("font-size", "10px")
      .attr("fill", "#fff")
      .text((d: any) => d.data.name);
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Technology Tree</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || !data.root.children || data.root.children.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Technology Tree</CardTitle></CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No technology tree data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Technology Tree</CardTitle>
      </CardHeader>
      <CardContent>
        <svg ref={svgRef} className="w-full" style={{ minHeight: "400px" }} />
      </CardContent>
    </Card>
  );
}
