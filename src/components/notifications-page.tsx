'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Loader2, CheckCheck, Clock, BellOff,
} from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getNotifications();
      if (result.data) setNotifications(result.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.5)] text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition disabled:opacity-50"
          >
            {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel border border-border/50 rounded-3xl p-12 text-center">
          <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`glass-panel border rounded-2xl p-5 transition-all duration-300 cursor-pointer group ${
                n.isRead
                  ? 'border-border/30 opacity-70 hover:opacity-100 hover:border-primary/30'
                  : 'border-primary/40 bg-primary/[0.03] shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.4)] relative overflow-hidden'
              }`}
            >
              {!n.isRead && (
                 <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_10px_0_hsl(var(--primary))]"/>
              )}
              <div className="flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 p-2 rounded-xl transition-colors ${n.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-base font-bold ${n.isRead ? 'text-foreground/70' : 'text-foreground'}`}>
                      {n.title}
                    </h4>
                  </div>
                  <p className={`text-sm mt-1.5 whitespace-pre-wrap leading-relaxed ${n.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
