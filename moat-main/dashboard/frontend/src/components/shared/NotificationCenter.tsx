"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Settings, ExternalLink, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useApp } from '@/lib/store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user } = useApp();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error: err } = await supabase
          .from('notifications')
          .select('id, type, title, description, is_read, created_at') // Phase 5 Optimization: Removed select(*)
          .in('receiver', [user.id, user.role || ''])
          .order('created_at', { ascending: false })
          .limit(20);

        if (err) throw err;
        setNotifications(data || []);
      } catch (e) {
        console.error('Failed to load notifications:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new.receiver === user.id || payload.new.receiver === user.role) {
            setNotifications(prev => [payload.new, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    // Optimistic UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            Mark all read
          </Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-1">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-500">
              <p>Unable to load notifications.</p>
              <Button variant="link" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm">You're all caught up.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-3 hover:bg-muted/50 cursor-pointer rounded-md mb-1 border transition-colors ${n.is_read ? 'opacity-70 bg-transparent border-transparent' : 'bg-card border-border'}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {n.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.description}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t bg-muted/20 text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
