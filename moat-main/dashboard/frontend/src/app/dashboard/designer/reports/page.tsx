"use client";

import React, { useState, useEffect } from "react";
import { PieChart as PieChartIcon, BarChart2, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DesignerReportsPage() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/designer/tasks");
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full gap-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <PieChartIcon className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Design Productivity Reports</h1>
        </div>
        <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Tasks Completed (MTD)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-4xl font-bold text-gray-900">42</div>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +12%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Avg. Turnaround Time</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-4xl font-bold text-gray-900">2.4 days</div>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> Faster
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Revision Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-4xl font-bold text-gray-900">14%</div>
            <div className="flex items-center text-red-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +2%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Task Distribution by Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-gray-50 rounded-md m-4 border border-dashed">
            <div className="text-gray-400 flex flex-col items-center gap-2">
              <PieChartIcon className="w-8 h-8 opacity-50" />
              <span>Chart Rendering Engine Needed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Completion Volume (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-gray-50 rounded-md m-4 border border-dashed">
            <div className="text-gray-400 flex flex-col items-center gap-2">
              <BarChart2 className="w-8 h-8 opacity-50" />
              <span>Chart Rendering Engine Needed</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
