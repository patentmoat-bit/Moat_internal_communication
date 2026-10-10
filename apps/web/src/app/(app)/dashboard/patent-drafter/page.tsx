"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Activity, Clock,
  ChevronRight, Sparkles, CheckCircle, Calendar, Inbox, Search, PlayCircle, ShieldCheck, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useActiveRole } from "@/components/auth/role-context";

export default function PatentDrafterDashboard() {
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [assignments, setAssignments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [docket, setDocket] = useState<{reminders: any[], actionItems: any[]}>({reminders: [], actionItems: []});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [asgRes, revRes, actRes, docRes] = await Promise.all([
          fetch('/api/patent-drafter/assignments').then(r => r.json()),
          fetch('/api/patent-drafter/review').then(r => r.json()),
          fetch('/api/patent-drafter/activity').then(r => r.json()),
          fetch('/api/patent-drafter/docket').then(r => r.json())
        ]);
        
        if (asgRes.success) setAssignments(asgRes.assignments || []);
        if (revRes.success) setReviews(revRes.reviews || []);
        setActivity(Array.isArray(actRes) ? actRes.slice(0, 5) : []);
        if (docRes.success) {
          setDocket({
            reminders: docRes.reminders || [],
            actionItems: docRes.actionItems || []
          });
        }
      } catch (e) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Compute Metrics
  const activeDrafts = assignments.filter(a => a.status === 'IN_PROGRESS');
  const pendingReview = reviews.filter(r => r.status === 'SUBMITTED_FOR_REVIEW' || r.status === 'UNDER_REVIEW');
  const approvedFinal = reviews.filter(r => r.status === 'APPROVED');
  
  // Get upcoming deadlines
  const sortedDeadlines = [...assignments].filter(a => a.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 3);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 text-white shadow-lg"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 text-emerald-300" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge variant="outline" className="bg-white/10 text-emerald-200 border-emerald-500/30 mb-4 tracking-widest uppercase text-[10px]">
              Role Portal: {currentUser.role.replace('_', ' ')}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
              Patent Drafting Studio
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-xl">
              Welcome back, <span className="font-semibold text-white">{currentUser.name}</span>. 
              You have <span className="text-emerald-400 font-bold">{activeDrafts.length} active drafts</span> requiring attention and <span className="text-amber-400 font-bold">{sortedDeadlines.length} upcoming deadlines</span>.
            </p>
          </div>
          
          <div className="shrink-0">
            {activeDrafts.length > 0 ? (
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105">
                <Link href={`/dashboard/patent-drafter/invention/details?id=${activeDrafts[0].invention_id}`}>
                  <PlayCircle className="w-5 h-5 mr-2" /> Resume Drafting
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105">
                <Link href={`/dashboard/patent-drafter/claims/builder`}>
                  <Sparkles className="w-5 h-5 mr-2" /> New Draft
                </Link>
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Metrics Row */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Drafts", value: activeDrafts.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Pending Review", value: pendingReview.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Assigned Inventions", value: assignments.length, icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Approved Final", value: approvedFinal.length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" }
        ].map((metric, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{metric.label}</p>
                    <p className="text-4xl font-black tracking-tighter text-foreground group-hover:scale-110 transition-transform origin-left">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${metric.bg}`}>
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Drafts & Quick Links */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Drafts Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="bg-slate-50/50 p-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Active Drafts in Progress
                </h3>
                <Link href="/dashboard/patent-drafter/drafts" className="text-xs text-blue-600 font-medium hover:underline flex items-center">
                  View All <ChevronRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
              <CardContent className="p-0">
                {activeDrafts.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                    <FileText className="w-8 h-8 opacity-20 mb-3" />
                    <p className="text-sm font-medium">No active drafts found.</p>
                    <p className="text-xs mt-1">Start drafting an assigned invention to see it here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {activeDrafts.map((draft, i) => {
                      const review = reviews.find(r => r.invention_id === draft.invention_id);
                      return (
                        <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-[10px]">{draft.invention_id}</Badge>
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                {review?.status || draft.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">{draft.title}</h4>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Link href={`/dashboard/patent-drafter/invention/details?id=${draft.invention_id}`}>
                              Open <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Action Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { title: "My Drafts", icon: FileText, href: "/dashboard/patent-drafter/claims/structure" },
               { title: "Claim Builder", icon: Sparkles, href: "/dashboard/patent-drafter/claims/builder" },
               { title: "Templates", icon: Activity, href: "/dashboard/patent-drafter/claims/editor" },
               { title: "Inbox", icon: Inbox, href: "/dashboard/patent-drafter/docket/reminders" }
             ].map((action, i) => (
               <Link href={action.href} key={i}>
                 <Card className="border-border/50 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all text-center group cursor-pointer h-full bg-white dark:bg-slate-900">
                   <CardContent className="p-6 flex flex-col items-center justify-center space-y-3">
                     <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                       <action.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                     </div>
                     <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-700 transition-colors">{action.title}</span>
                   </CardContent>
                 </Card>
               </Link>
             ))}
          </div>
        </div>

        {/* Right Column: Deadlines & Activity */}
        <div className="space-y-6">
          
          {/* Deadlines */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="bg-red-50/50 p-4 border-b border-red-100 flex items-center gap-2 text-red-700">
                <Calendar className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Upcoming Deadlines</h3>
              </div>
              <CardContent className="p-0">
                {sortedDeadlines.length === 0 ? (
                   <div className="p-8 text-center text-xs text-muted-foreground">No upcoming deadlines.</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {sortedDeadlines.map((deadline, i) => {
                       const days = Math.ceil((new Date(deadline.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                       const isUrgent = days <= 5;
                       return (
                         <div key={i} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                           <div className={`shrink-0 p-2 rounded-md ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                             {isUrgent ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                           </div>
                           <div className="min-w-0 flex-1">
                             <p className="text-xs font-bold truncate text-slate-800">{deadline.title}</p>
                             <div className="flex items-center gap-2 mt-1">
                               <Badge variant="outline" className="text-[9px] border-slate-200">{deadline.invention_id}</Badge>
                               <span className={`text-[10px] font-medium ${isUrgent ? 'text-red-600' : 'text-slate-500'}`}>
                                 {days > 0 ? `${days} days left` : 'Overdue'}
                               </span>
                             </div>
                           </div>
                         </div>
                       );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity Timeline */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-border/50 shadow-sm overflow-hidden bg-gradient-to-b from-white to-slate-50/50">
              <div className="p-4 border-b border-border/50 flex justify-between items-center bg-white">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" /> Recent Activity
                </h3>
              </div>
              <CardContent className="p-0">
                {activity.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">No recent activity.</div>
                ) : (
                  <div className="p-4 space-y-4">
                    {activity.map((log, i) => (
                      <div key={i} className="flex gap-3 relative">
                        {i !== activity.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-slate-100"></div>
                        )}
                        <div className="shrink-0 w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center z-10 shadow-sm">
                          <span className="text-[9px] font-bold text-purple-700">{log.actor?.charAt(0) || "U"}</span>
                        </div>
                        <div className="pt-0.5 min-w-0">
                          <p className="text-xs text-slate-800 leading-snug">
                            <span className="font-bold">{log.actor}</span> {log.action}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
