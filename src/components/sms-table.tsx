'use client';

import { useState, Fragment } from 'react';
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

const renderMessageWithLink = (message: string, link?: string) => {
  if (!link || !message.includes(link)) {
    return message;
  }
  const parts = message.split(link);
  return (
    <Fragment>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {link}
            </a>
          )}
        </Fragment>
      ))}
    </Fragment>
  );
};


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
    <div className="rounded-md border overflow-hidden">
      <ScrollArea className="h-[65vh] w-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <TableRow>
                <TableHead className="min-w-[100px]">Datetime</TableHead>
                <TableHead className="hidden md:table-cell">Sender ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Range</TableHead>
                <TableHead className="hidden sm:table-cell">Rate</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No messages to display. Please validate your API key and set filters.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record, index) => (
                  <TableRow key={`${record.dateTime}-${index}`}>
                    <TableCell className="font-medium whitespace-nowrap align-top text-xs sm:text-sm">{record.dateTime}</TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap align-top">{record.senderId}</TableCell>
                    <TableCell className="align-top">
                        <div className="truncate max-w-[100px] sm:max-w-none text-xs sm:text-sm">{record.phone}</div>
                        {record.extractedInfo?.confirmationCode && (
                          <div 
                            className="inline-flex items-center gap-1 sm:gap-2 cursor-pointer rounded-md bg-primary/10 px-1.5 sm:px-2 py-1 mt-1 sm:mt-2 text-primary transition-colors hover:bg-primary/20"
                            onClick={() => handleCopyCode(record.extractedInfo.confirmationCode!)}
                          >
                              <span className="font-mono text-xs sm:text-sm font-bold">{record.extractedInfo.confirmationCode}</span>
                              <span className="text-primary/80">
                                {copiedCode === record.extractedInfo.confirmationCode ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                              </span>
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell align-top truncate">{record.range}</TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap align-top truncate">{`${record.rate} ${record.currency}`}</TableCell>
                    <TableCell className="align-top">
                      <p className="whitespace-pre-wrap break-words text-xs sm:text-sm max-w-[150px] sm:max-w-none">
                        {renderMessageWithLink(record.message, record.extractedInfo?.link)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </ScrollArea>
    </div>
  );
}
