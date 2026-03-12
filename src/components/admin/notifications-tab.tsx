'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Trash2, Bell, Users, Clock } from 'lucide-react';
import { createNotification, getAdminNotifications, deleteNotification } from '@/app/actions';

interface AdminNotification {
    id: string;
    title: string;
    message: string;
    createdBy: string;
    readCount: number;
    createdAt: string;
}

export function NotificationsTab() {
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    const fetchNotifications = async () => {
        try {
            const result = await getAdminNotifications();
            if (result.data) setNotifications(result.data);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load notifications' });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Title and message are required.' });
            return;
        }
        setIsSending(true);
        try {
            const result = await createNotification(title, message);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            } else {
                toast({ title: 'Notification Sent', description: 'All users will see this notification.' });
                setTitle('');
                setMessage('');
                await fetchNotifications();
            }
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send notification' });
        }
        setIsSending(false);
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const result = await deleteNotification(id);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            } else {
                toast({ title: 'Notification Deleted' });
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' });
        }
        setDeletingId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Send Notification */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Send Notification
                    </CardTitle>
                    <CardDescription>
                        Send a notification to all users and agents. Everyone will see this in their notifications page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                        <Input
                            placeholder="Notification title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                        <Textarea
                            placeholder="Write your notification message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        {isSending ? 'Sending...' : 'Send to All Users'}
                    </Button>
                </CardContent>
            </Card>

            {/* Sent Notifications */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Sent Notifications
                    </CardTitle>
                    <CardDescription>
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''} sent
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No notifications sent yet. Use the form above to send your first notification.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                                >
                                    <Bell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.message}</p>
                                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {n.readCount} read
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(n.id)}
                                        disabled={deletingId === n.id}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                    >
                                        {deletingId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
