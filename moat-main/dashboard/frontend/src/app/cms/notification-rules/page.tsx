"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Edit, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotificationRulesCMS() {
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    event_type: "",
    priority: "Normal",
    status: "Active",
    notify_assignee: false,
    notify_user_ids: [] as string[]
  });

  useEffect(() => {
    fetchRules();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/notification-rules");
      const result = await res.json();
      if (result.data) {
        setRules(result.data);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error fetching rules",
        description: "Failed to load notification rules from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      id: "",
      name: "",
      description: "",
      event_type: "",
      priority: "Normal",
      status: "Active",
      notify_assignee: false,
      notify_user_ids: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: any) => {
    setFormData({
      id: rule.id,
      name: rule.name,
      description: rule.description || "",
      event_type: rule.event_type,
      priority: rule.priority,
      status: rule.status,
      notify_assignee: rule.notify_assignee || false,
      notify_user_ids: rule.notify_user_ids || []
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.event_type) {
      toast({
        title: "Validation Error",
        description: "Name and Event Type are required.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!formData.id;
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch("/api/settings/notification-rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || "Failed to save");

      toast({
        title: isEdit ? "Rule Updated" : "Rule Created",
        description: `Successfully ${isEdit ? 'updated' : 'created'} notification rule.`,
      });
      
      setIsModalOpen(false);
      fetchRules();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error saving rule",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNotifyUser = (val: string) => {
    if (val !== "none" && !formData.notify_user_ids.includes(val)) {
      setFormData({ ...formData, notify_user_ids: [...formData.notify_user_ids, val] });
    }
  };

  const handleRemoveNotifyUser = (idToRemove: string) => {
    setFormData({ ...formData, notify_user_ids: formData.notify_user_ids.filter(id => id !== idToRemove) });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const res = await fetch(`/api/settings/notification-rules?id=${id}`, {
        method: "DELETE"
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");

      toast({
        title: "Rule Deleted",
        description: "Successfully deleted notification rule.",
      });
      
      fetchRules();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error deleting rule",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Notification Rule Engine</h1>
          <p className="text-muted-foreground mt-2">
            Manage event-driven email notification rules, templates, and routing conditions.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Rules</CardTitle>
          <CardDescription>
            Active rules will trigger emails automatically when their event conditions are met.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : rules.length === 0 ? (
             <div className="py-8 text-center text-muted-foreground">
               No notification rules configured yet. Click "Add Rule" to create one.
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {rule.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        {rule.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.priority === 'High' ? 'destructive' : 'secondary'}>
                        {rule.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.status === 'Active' ? 'default' : 'outline'} className={rule.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none' : ''}>
                        {rule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(rule)} className="text-muted-foreground hover:text-foreground">
                        <Edit className="w-4 h-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Edit Notification Rule" : "Add Notification Rule"}</DialogTitle>
            <DialogDescription>
              Configure the event triggers and status for this rule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Project Approved Email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Rule Description (Comments)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain when and why this rule applies..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Input
                id="event_type"
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                placeholder="e.g. PROJECT_APPROVED"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
              <div className="space-y-0.5">
                <Label>Notify Assignee</Label>
                <p className="text-[0.8rem] text-muted-foreground">
                  Automatically route this notification to the assigned user.
                </p>
              </div>
              <Switch
                checked={formData.notify_assignee}
                onCheckedChange={(checked) => setFormData({ ...formData, notify_assignee: checked })}
              />
            </div>
            
            <div className="grid gap-2 mt-2">
              <Label>Notify Specific Users</Label>
              {formData.notify_user_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.notify_user_ids.map(id => {
                    const u = users.find(u => u.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {u?.name || id}
                        <button type="button" onClick={() => handleRemoveNotifyUser(id)} className="text-muted-foreground hover:text-foreground">
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Select
                value="none"
                onValueChange={handleAddNotifyUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add a user to notify..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select user to add...</SelectItem>
                  {users.filter(u => !formData.notify_user_ids.includes(u.id)).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
