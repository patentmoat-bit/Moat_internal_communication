"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Search, ArrowRight, FilePenLine } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";


export function DraftList({ statusFilter, title, description }: { statusFilter: string[], title: string, description: string }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = (opts) => console.log('Toast:', opts);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setLoading(true);
        // Using the documents API we created earlier
        const res = await fetch("/api/patent-drafter/documents");
        const data = await res.json();
        if (data.success) {
          // If statusFilter is empty, return all. Otherwise filter.
          let filtered = data.data || [];
          if (statusFilter.length > 0) {
            filtered = filtered.filter((d: any) => {
              const st = (d.status || "Draft").toLowerCase();
              return statusFilter.some(f => st.includes(f.toLowerCase()));
            });
          }
          setDrafts(filtered);
        } else {
          throw new Error(data.error || "Failed to load drafts");
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
  }, [statusFilter]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8 pb-14 px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-2 text-foreground">{title}</h1>
        <p className="text-muted-foreground font-medium max-w-2xl">{description}</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse border border-border/40 bg-white dark:bg-card rounded-2xl shadow-sm">
            Syncing drafts...
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground border border-border/40 bg-white dark:bg-card rounded-2xl shadow-sm">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold text-foreground mb-1">No drafts found.</p>
            <p className="text-sm">There are no documents matching this status.</p>
          </div>
        ) : (
          drafts.map((draft) => (
            <motion.div variants={item} key={draft.id}>
              <Card className="border border-border/40 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 bg-white dark:bg-card rounded-2xl group overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-wider text-[10px]">
                          {draft.status || "Draft"}
                        </Badge>
                        <Badge variant="outline" className="bg-muted text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                          v{draft.version || "1.0"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 
                          Updated {new Date(draft.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h2 className="text-xl font-bold text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                        {draft.title || "Untitled Draft"}
                      </h2>
                      
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                          <span className="text-muted-foreground">Type:</span> {draft.file_type || "Specification"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px] shrink-0">
                      <Link href={`/dashboard/patent-drafter/editor?id=${draft.project_id}`} className="w-full">
                        <Button className="w-full justify-between font-bold rounded-xl h-12 shadow-md bg-blue-600 hover:bg-blue-700 text-white">
                          Continue Drafting <FilePenLine className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
