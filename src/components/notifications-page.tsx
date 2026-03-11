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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
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
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`bg-card border rounded-2xl p-4 transition-colors cursor-pointer ${
                n.isRead
                  ? 'border-border/50 opacity-70'
                  : 'border-primary/30 bg-primary/[0.03] shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 ${n.isRead ? 'text-muted-foreground' : 'text-primary'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-semibold ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 whitespace-pre-wrap ${n.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
