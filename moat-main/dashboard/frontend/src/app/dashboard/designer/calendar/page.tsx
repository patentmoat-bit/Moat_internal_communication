"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DesignerCalendarPage() {
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

  // Simple static calendar grid for demo purposes
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Task Calendar</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold text-lg text-gray-700">June 2026</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-500 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 overflow-y-auto">
            {days.map(day => {
              // Find tasks due on this day (mock mapping)
              const dayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).getDate() === day);
              
              return (
                <div key={day} className="border-b border-r last:border-r-0 min-h-[120px] p-2 hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-500">{day}</span>
                  <div className="mt-2 flex flex-col gap-1">
                    {dayTasks.map(task => (
                      <div key={task.id} className={`text-xs px-2 py-1 rounded truncate cursor-pointer ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`} title={task.title}>
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
