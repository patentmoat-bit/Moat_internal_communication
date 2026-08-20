"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { GripVertical, Plus, Save, Settings2, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock Data
const initialSidebarItems = [
  { id: "1", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", role_access: ["CEO", "Analyst"] },
  { id: "2", label: "Patent Search", path: "/dashboard/search", icon: "Search", role_access: ["Analyst", "R&D"] },
  { id: "3", label: "Tracker", path: "/dashboard/tracker", icon: "Activity", role_access: ["All"] },
  { id: "4", label: "Reports", path: "/dashboard/reports", icon: "FileBarChart", role_access: ["CEO", "Manager"] },
];

export default function SidebarBuilderCMS() {
  const [items, setItems] = useState(initialSidebarItems);

  // In a real app with React 19, we might use a different dnd library, but mapping the logic out here
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    setItems(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sidebar Builder</h1>
          <p className="text-muted-foreground mt-2">
            Drag and drop to reorder sidebar menus. Assign role access for dynamic visibility.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Add Menu Item
          </Button>
          <Button className="gap-2">
            <Save className="w-4 h-4" /> Save Layout
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Menu Structure</CardTitle>
              <CardDescription>Drag items to reorder them in the global sidebar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm group">
                    <div className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 font-medium">{item.label}</div>
                      <div className="col-span-4 text-sm text-muted-foreground font-mono truncate">{item.path}</div>
                      <div className="col-span-4 flex flex-wrap gap-1">
                        {item.role_access.map(r => (
                          <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" /> Item Properties
              </CardTitle>
              <CardDescription>Edit details for selected menu item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input placeholder="e.g. Dashboard" defaultValue="Patent Search" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Path / URL</label>
                <Input placeholder="e.g. /dashboard" defaultValue="/dashboard/search" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon Name</label>
                <Input placeholder="lucide-react icon name" defaultValue="Search" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Access</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="default">Analyst</Badge>
                  <Badge variant="default">R&D</Badge>
                  <Badge variant="outline" className="border-dashed cursor-pointer hover:bg-muted"><Plus className="w-3 h-3 mr-1"/> Add Role</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
