"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight, CheckCircle2, AlertTriangle, FileEdit } from "lucide-react";
import Link from "next/link";
import { useActiveRole } from "@/components/auth/role-context";

export default function ActionItemsPage() {
  const { currentUser } = useActiveRole();
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const asgRes = await fetch('/api/patent-drafter/assignments');
        const asgData = await asgRes.json();
        
        const items: any[] = [];

        if (asgData.assignments) {
          asgData.assignments.forEach((asg: any) => {
            if (asg.status === 'ASSIGNED') {
              items.push({
                id: `act-${asg.id}-accept`,
                title: "Accept New Assignment",
                description: `You have been assigned ${asg.title} (${asg.invention_id}). You must accept it to begin drafting.`,
                priority: "High",
                icon: ClipboardList,
                link: `/dashboard/patent-drafter/invention/details?id=${asg.invention_id}`
              });
            }
            if (asg.status === 'REVISION_REQUIRED') {
              items.push({
                id: `act-${asg.id}-rev`,
                title: "Address Reviewer Revisions",
                description: `The Patent Analyst has requested revisions for ${asg.invention_id}.`,
                priority: "Critical",
                icon: AlertTriangle,
                link: `/dashboard/patent-drafter/review/annotations?id=${asg.invention_id}`
              });
            }
            if (asg.status === 'DRAFTING') {
              items.push({
                id: `act-${asg.id}-draft`,
                title: "Continue Drafting",
                description: `Draft for ${asg.invention_id} is currently in progress. Finish claims and submit for review.`,
                priority: "Medium",
                icon: FileEdit,
                link: `/dashboard/patent-drafter/claims/list?id=${asg.invention_id}`
              });
            }
          });
        }
        
        setActionItems(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Computing Actionable Tasks...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-fuchsia-500" /> Action Items
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Dynamically generated tasks based on blocked workflow states.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {actionItems.length === 0 ? (
          <Card className="border-border/50 border-dashed shadow-sm bg-white dark:bg-card">
            <CardContent className="p-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <CheckCircle2 className="w-12 h-12 opacity-20 mb-4" />
              <h3 className="font-semibold mb-2">No Action Items</h3>
              <p className="text-sm">You are all caught up! There are no blocked workflows requiring your attention.</p>
            </CardContent>
          </Card>
        ) : (
          actionItems.map((item: any) => (
            <Card key={item.id} className="border-border/50 shadow-sm bg-white dark:bg-card hover:border-slate-300 transition-colors">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg flex-shrink-0 mt-1 ${
                    item.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                    item.priority === 'High' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-200' :
                        item.priority === 'High' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>

                <div className="flex-shrink-0 md:pl-4 md:border-l border-slate-100">
                  <Link href={item.link}>
                    <Button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white">
                      Resolve <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
