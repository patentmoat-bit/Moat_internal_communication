import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuthStore } from '@/stores/authStore';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuthStore();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data);
        setUnreadCount(json.data.filter((n: AppNotification) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (id: string | 'all') => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (id === 'all') {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } else {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    
    // Initial fetch
    fetchNotifications();

    // Supabase Realtime Subscription
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const userChannel = supabase.channel(`realtime_notifications_user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver=eq.${user.id}`
        },
        (payload) => {
          console.log("New realtime user notification received:", payload.new);
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          if (!newNotif.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `receiver=eq.${user.id}`
        },
        (payload) => {
          const updatedNotif = payload.new as AppNotification;
          setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
          
          setUnreadCount(prev => {
            const wasRead = payload.old.is_read;
            const isRead = updatedNotif.is_read;
            if (!wasRead && isRead) return Math.max(0, prev - 1);
            if (wasRead && !isRead) return prev + 1;
            return prev;
          });
        }
      )
      .subscribe();

    let roleChannel: any = null;
    if (user.role) {
      roleChannel = supabase.channel(`realtime_notifications_role_${user.role}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `receiver=eq.${user.role}`
          },
          (payload) => {
            console.log("New realtime role notification received:", payload.new);
            const newNotif = payload.new as AppNotification;
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            if (!newNotif.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `receiver=eq.${user.role}`
          },
          (payload) => {
            const updatedNotif = payload.new as AppNotification;
            setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
            
            setUnreadCount(prev => {
              const wasRead = payload.old.is_read;
              const isRead = updatedNotif.is_read;
              if (!wasRead && isRead) return Math.max(0, prev - 1);
              if (wasRead && !isRead) return prev + 1;
              return prev;
            });
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(userChannel);
      if (roleChannel) supabase.removeChannel(roleChannel);
    };
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    refresh: fetchNotifications
  };
}
