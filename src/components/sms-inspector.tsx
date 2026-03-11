'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchSmsData } from '@/app/actions';
import { SmsTable } from '@/components/sms-table';
import type { SmsRecord } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { subHours } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface SmsInspectorProps {
    initialRecords?: SmsRecord[];
    initialError?: string;
    refreshInterval?: number;
}


export function SmsInspector({ initialRecords = [], initialError, refreshInterval = 60 }: SmsInspectorProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<SmsRecord[]>(initialRecords);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(refreshInterval);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Show initial error if there was one during server-side fetch
  useEffect(() => {
    if (initialError) {
        toast({
            variant: 'destructive',
            title: 'Failed to fetch data',
            description: initialError,
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialError]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchSmsData({
        startDate: subHours(new Date(), 24),
        endDate: new Date(),
        senderId: '',
        phone: '',
      });
      if (result.data) {
        setRecords(result.data);
      }
    } catch {
      // silently fail on auto-refresh
    } finally {
      setIsRefreshing(false);
      setCountdown(refreshInterval);
    }
  }, [refreshInterval]);

  // Auto-refresh timer
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    setCountdown(refreshInterval);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [refreshInterval, refresh]);

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Console</CardTitle>
                    <CardDescription>{records.length} messages found</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isRefreshing && <Loader2 className="h-3 w-3 animate-spin" />}
                    {refreshInterval > 0 && (
                      <span>Refresh in {countdown}s</span>
                    )}
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <SmsTable records={records} isLoading={false} />
        </CardContent>
    </Card>
  );
}
