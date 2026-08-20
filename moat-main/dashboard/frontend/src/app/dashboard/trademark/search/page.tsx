"use client";

import Link from "next/link";
import { ChevronLeft, Type, Image as ImageIcon, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TrademarkSearchHub() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/trademark" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to Trademark Hub
        </Link>
      </div>

      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Trademark Search Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Select the type of trademark search you wish to perform. Our AI-powered engine supports deep semantic word analysis and advanced computer vision logo recognition.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <Link href="/dashboard/trademark/word" className="group">
          <Card className="hover:border-[#c9a84c] border-2 border-transparent bg-white dark:bg-card shadow-sm hover:shadow-md transition-all h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-8 w-8 rounded-full bg-[#c9a84c] text-white flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            <CardHeader className="pb-4">
              <div className="h-14 w-14 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <Type className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl">Word Mark Search</CardTitle>
              <CardDescription className="pt-2 text-sm leading-relaxed">
                Analyze textual trademarks using phonetic, semantic, and exact match AI algorithms across global databases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <ul className="text-sm text-muted-foreground space-y-2.5 font-medium">
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Phonetic Similarity Scoring</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Semantic & Conceptual Mapping</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Real-time Multi-jurisdiction Scan</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/trademark/logo" className="group">
          <Card className="hover:border-[#c9a84c] border-2 border-transparent bg-white dark:bg-card shadow-sm hover:shadow-md transition-all h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-8 w-8 rounded-full bg-[#c9a84c] text-white flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            <CardHeader className="pb-4">
              <div className="h-14 w-14 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                <ImageIcon className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl">Logo & Image Search</CardTitle>
              <CardDescription className="pt-2 text-sm leading-relaxed">
                Upload a mark to perform a structural and conceptual visual search powered by state-of-the-art Computer Vision.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <ul className="text-sm text-muted-foreground space-y-2.5 font-medium">
                  <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Computer Vision (CV) Analysis</li>
                  <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Automatic Vienna Classification</li>
                  <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Visual Similarity Ranking</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
