"use client";

import Link from "next/link";
import { ChevronLeft, BookOpen, Search, Filter, Hash, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrademarkClassificationPage() {
  const MOCK_CLASSES = [
    { id: "09", name: "Computers & Software", description: "Scientific, nautical, surveying, photographic, cinematographic, optical, weighing, measuring, signalling, checking, life-saving apparatus." },
    { id: "35", name: "Business Services", description: "Advertising; business management; business administration; office functions; retail store services." },
    { id: "41", name: "Education & Entertainment", description: "Education; providing of training; entertainment; sporting and cultural activities." },
    { id: "42", name: "Science & Technology", description: "Scientific and technological services and research and design relating thereto; industrial analysis." }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/trademark" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to Trademark Dashboard
        </Link>
      </div>

      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Trademark Classification</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Search and assign Nice Classifications for goods and services, or explore Vienna Classifications for figurative elements in logo marks.
          </p>
        </div>
      </header>

      {/* Main Search Area */}
      <Card className="border-border/70 shadow-sm mt-8">
        <CardHeader className="border-b border-border/40 bg-muted/10 pb-6">
          <CardTitle className="text-lg flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-[#c9a84c]" /> Nice Classification Database
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:flex-1 sm:max-w-2xl">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search goods and services (e.g., 'software', 'clothing', 'coffee')..." 
                className="h-12 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[#c9a84c] transition-all" 
              />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <button className="flex-1 sm:flex-none flex h-12 items-center justify-center gap-2 rounded-md bg-[#131309] dark:bg-white text-white dark:text-black px-6 text-sm font-semibold hover:opacity-90 transition-opacity">
                Search Classes
              </button>
              <button className="flex h-12 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm hover:bg-muted transition-colors">
                <Filter className="h-4 w-4" /> Advanced
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Frequently Used Classes</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {MOCK_CLASSES.map((cls) => (
              <div key={cls.id} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Hash className="h-4 w-4 mr-0.5" />
                  <span className="text-sm font-bold">{cls.id}</span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-[#c9a84c] transition-colors">{cls.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {cls.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vienna Classification Callout */}
      <Card className="border-border/70 border-dashed bg-muted/5 mt-6">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Need to classify a Logo?</h4>
              <p className="text-sm text-muted-foreground mt-0.5">Use the Vienna Classification system for figurative marks and visual elements.</p>
            </div>
          </div>
          <button className="whitespace-nowrap px-4 py-2 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-600 font-semibold text-sm hover:bg-purple-500 hover:text-white transition-colors">
            Browse Vienna Classes
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
