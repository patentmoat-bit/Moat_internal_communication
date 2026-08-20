"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AIChatPanelProps {
  recommendations: string[];
}

export function AIChatPanel({ recommendations }: AIChatPanelProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <Card className="border-border/70 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-[#c9a84c]" />
          AI Co-Pilot Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className="flex gap-3 text-sm p-3 bg-background/50 rounded-lg border border-border/40">
            <span className="text-[#c9a84c] font-bold">{index + 1}.</span>
            <p className="leading-relaxed">{rec}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" className="w-full justify-between group text-xs border-border/70 hover:bg-primary hover:text-primary-foreground">
          <span>Open Copilot Workspace</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
}
