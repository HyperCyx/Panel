'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { SmsRecord } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';

interface SmsTableProps {
  records: SmsRecord[];
  isLoading: boolean;
}

/** Show all digits except mask the last 4 with X */
function maskPhone(phone: string): string {
  if (!phone) return '—';
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.length <= 4) return 'XXXX';
  return clean.slice(0, -4) + 'XXXX';
}

export function SmsTable({ records, isLoading }: SmsTableProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({ variant: 'destructive', title: 'Copy not supported' });
      return;
    }
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: 'Code Copied!' });
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(() => {
      toast({ variant: 'destructive', title: 'Failed to copy' });
    });
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-hidden">
        <ScrollArea className="h-[65vh] w-full">
          <div className="overflow-x-auto min-w-full">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-[100px]">Datetime</TableHead>
                  <TableHead className="hidden md:table-cell">Sender ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No messages to display. Please validate your API key and set filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={`${record.dateTime}-${index}`}>
                      <TableCell className="font-medium whitespace-nowrap align-top text-sm">{record.dateTime}</TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap align-top">{record.senderId}</TableCell>
                      <TableCell className="align-top">
                          <div className="text-sm font-mono">{maskPhone(record.phone)}</div>
                          {record.extractedInfo?.confirmationCode && (
                            <div 
                              className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-primary/10 px-2 py-1 mt-2 text-primary transition-colors hover:bg-primary/20"
                              onClick={() => handleCopyCode(record.extractedInfo.confirmationCode!)}
                            >
                                <span className="font-mono text-sm font-bold">{record.extractedInfo.confirmationCode}</span>
                                <span className="text-primary/80">
                                  {copiedCode === record.extractedInfo.confirmationCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </span>
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="align-top truncate text-sm">{record.range || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      {/* Mobile View — vertical scrollable table like get-number page */}
      <div className="sm:hidden overflow-hidden">
        <div className="max-h-[65vh] overflow-y-auto">
          {records.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
              No messages to display. Please validate your API key and set filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-left" style={{ minWidth: '600px' }}>
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 px-3 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Phone &<br/>OTP</th>
                    <th className="pb-3 px-3 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Range</th>
                    <th className="pb-3 px-3 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Sender</th>
                    <th className="pb-3 px-3 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={`${record.dateTime}-${index}`} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-3">
                        <p className="text-xs font-mono font-semibold text-foreground">{maskPhone(record.phone)}</p>
                        {record.extractedInfo?.confirmationCode && (
                          <div 
                            className="inline-flex items-center gap-1.5 cursor-pointer rounded-md bg-primary/10 px-2 py-1 mt-1 text-primary transition-colors active:bg-primary/30"
                            onClick={() => handleCopyCode(record.extractedInfo.confirmationCode!)}
                          >
                            <span className="font-mono text-xs font-bold">{record.extractedInfo.confirmationCode}</span>
                            <span className="text-primary/80">
                              {copiedCode === record.extractedInfo.confirmationCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-medium text-foreground">{record.range || '—'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs font-medium text-foreground">{record.senderId || '—'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{record.dateTime}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
