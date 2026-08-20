"use client";

import React, { useState, useEffect } from "react";
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DesignerDashboardOverview() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        // Filter to only show documents assigned to design team workflows
        const filtered = data.data.filter((d: any) => 
          [
            "Pending Design Review", "Pending Design Work", "Design In Progress",
            "Changes Requested", "Revision Requested by CEO", "CEO Rejected", "Rejected",
            "Completed", "CEO Approved", "Approved", "Under Design Review", "Returned to Designing Team"
          ].includes(d.status)
        );
        setDocuments(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = documents.filter(d => ["Pending Design Review", "Pending Design Work", "Under Design Review", "Changes Requested", "Revision Requested by CEO", "Returned to Designing Team"].includes(d.status)).length;
  const inProgressCount = documents.filter(d => d.status === "Design In Progress").length;
  const completedCount = documents.filter(d => ["Completed", "CEO Approved", "Approved"].includes(d.status)).length;
  const highPriorityCount = documents.filter(d => !["Completed", "CEO Approved", "Approved"].includes(d.status) && d.priority_level === 'High').length;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-8 h-8 text-purple-600" />
        <h1 className="text-3xl font-bold">Design Team Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">{pendingCount}</div>
            <p className="text-xs text-gray-400 mt-1">Require action</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-xs text-gray-400 mt-1">Currently designing</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-gray-400 mt-1">Successfully designed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{highPriorityCount}</div>
            <p className="text-xs text-gray-400 mt-1">Urgent active tasks</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold border-b pb-2">My Work Queue</h2>
        {loading ? (
          <div>Loading...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 border border-dashed rounded-lg text-center text-gray-500">No active tasks in your queue.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.filter(d => !["Completed", "CEO Approved", "Approved"].includes(d.status)).map(doc => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg line-clamp-1" title={doc.title}>{doc.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${doc.priority_level === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {doc.priority_level || 'Normal'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{doc.client_name ? `Client: ${doc.client_name}` : 'Internal Project'}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {doc.status}
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/designer/documents">View Workspace</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

