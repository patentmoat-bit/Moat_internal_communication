"use client";

import React, { useState, useEffect } from "react";
import { KanbanSquare, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const COLUMNS = [
  "Assigned",
  "In Progress",
  "Waiting for Clarification",
  "Ready for Review",
  "Completed"
];

export default function DesignerKanbanPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const { toast } = useToast();

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

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/designer/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: "Status updated" });
        fetchTasks();
      }
    } catch (e) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <KanbanSquare className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Design Tasks</h1>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2"/> New Task</Button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col} className="min-w-[300px] max-w-[300px] bg-gray-50 rounded-lg p-4 flex flex-col h-full border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">{col}</h3>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                {tasks.filter(t => t.status === col).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
              {tasks.filter(t => t.status === col).map(task => (
                <div key={task.id} className="bg-white p-3 rounded shadow-sm border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {task.priority || 'Medium'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-medium text-sm text-gray-900 mb-1 leading-tight">{task.title}</h4>
                  
                  {/* Select status dropdown for simplicity instead of drag-drop for now */}
                  <select 
                    className="w-full text-xs mt-2 border-gray-200 rounded p-1"
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value)}
                  >
                    {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
