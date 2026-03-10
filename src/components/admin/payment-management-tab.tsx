'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Clock, Send, Ban } from 'lucide-react';
import { getAllPaymentRequests, updatePaymentStatus } from '@/app/actions';
import type { PaymentRequestInfo } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-blue-100 text-blue-800',
    rejected_deducted: 'bg-red-100 text-red-800',
  };
  const labels: Record<string, string> = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected (Refunded)',
    rejected_deducted: 'Rejected (Deducted)',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export function PaymentManagementTab() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRequestInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'rejected_deducted'>('all');

  // Action modal
  const [actionPayment, setActionPayment] = useState<PaymentRequestInfo | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'rejected_deducted'>('approved');
  const [adminNote, setAdminNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const result = await getAllPaymentRequests();
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        setPayments(result.data || []);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch payments' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openActionModal = (payment: PaymentRequestInfo, type: 'approved' | 'rejected' | 'rejected_deducted') => {
    setActionPayment(payment);
    setActionType(type);
    setAdminNote('');
  };

  const handleAction = async () => {
    if (!actionPayment) return;
    setIsUpdating(true);
    try {
      const result = await updatePaymentStatus(actionPayment.id, actionType, adminNote || undefined);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Failed', description: result.error });
      } else {
        toast({
          title: actionType === 'approved' ? 'Payment Approved' : 'Payment Rejected',
          description: actionType === 'approved'
            ? 'Withdrawal has been approved.'
            : actionType === 'rejected'
            ? 'Amount has been refunded to the user.'
            : 'Payment rejected. Balance stays deducted.',
        });
        setActionPayment(null);
        fetchPayments();
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update payment' });
    }
    setIsUpdating(false);
  };

  const filtered = payments.filter(p => filter === 'all' || p.status === filter);
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Payment Management
                {pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingCount} pending
                  </span>
                )}
              </CardTitle>
              <CardDescription>Review and manage user withdrawal requests.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected', 'rejected_deducted'] as const).map(f => {
              const label = f === 'rejected_deducted' ? 'Deducted' : f.charAt(0).toUpperCase() + f.slice(1);
              return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
            <ScrollArea className="h-[60vh] w-full rounded-md border hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Wallet Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No payment requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{payment.userName}</div>
                          <div className="text-xs text-muted-foreground">{payment.userEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-sm">
                            {payment.currency} {payment.amount.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="font-mono text-xs truncate max-w-[200px]" title={payment.walletAddress}>
                            {payment.walletAddress}
                          </div>
                          <div className="text-xs text-muted-foreground">{payment.network}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status} />
                          {payment.adminNote && (
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">{payment.adminNote}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => openActionModal(payment, 'approved')}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                onClick={() => openActionModal(payment, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Refund
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => openActionModal(payment, 'rejected_deducted')}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Deduct
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Mobile Card List */}
            <div className="sm:hidden space-y-3 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payment requests found.</p>
              ) : (
                filtered.map(payment => (
                  <div key={payment.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{payment.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{payment.userEmail}</p>
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs border-t pt-2">
                      <span className="font-bold text-sm text-foreground">{payment.currency} {payment.amount.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs border-t pt-2">
                      <p className="font-mono text-foreground truncate">{payment.walletAddress}</p>
                      <p className="text-muted-foreground">{payment.network}</p>
                    </div>
                    {payment.adminNote && (
                      <p className="text-xs text-muted-foreground italic border-t pt-1">Note: {payment.adminNote}</p>
                    )}
                    {payment.status === 'pending' && (
                      <div className="flex gap-1.5 border-t pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-7 text-[11px] px-1.5"
                          onClick={() => openActionModal(payment, 'approved')}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-0.5 flex-shrink-0" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 text-blue-600 border-blue-300 hover:bg-blue-50 h-7 text-[11px] px-1.5"
                          onClick={() => openActionModal(payment, 'rejected')}
                        >
                          <XCircle className="h-3 w-3 mr-0.5 flex-shrink-0" />
                          Refund
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-0 text-red-600 border-red-300 hover:bg-red-50 h-7 text-[11px] px-1.5"
                          onClick={() => openActionModal(payment, 'rejected_deducted')}
                        >
                          <Ban className="h-3 w-3 mr-0.5 flex-shrink-0" />
                          Deduct
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionPayment} onOpenChange={(open) => !open && setActionPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve Payment' : actionType === 'rejected' ? 'Reject & Refund' : 'Reject & Deduct'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approved'
                ? 'Confirm this withdrawal request. The user has already been debited.'
                : actionType === 'rejected'
                ? 'Reject this withdrawal. The amount will be refunded to the user\'s balance.'
                : 'Reject this withdrawal. The balance will remain deducted and will NOT be refunded.'}
            </DialogDescription>
          </DialogHeader>
          {actionPayment && (
            <div className="space-y-3 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User:</span>
                <span className="font-medium">{actionPayment.userName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold">{actionPayment.currency} {actionPayment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wallet:</span>
                <span className="font-mono text-xs break-all">{actionPayment.walletAddress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network:</span>
                <span>{actionPayment.network}</span>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium">Admin Note (optional)</label>
                <Input
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note..."
                  disabled={isUpdating}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleAction}
              disabled={isUpdating}
              variant={actionType === 'approved' ? 'default' : 'destructive'}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === 'approved' ? 'Approve' : actionType === 'rejected' ? 'Reject & Refund' : 'Reject & Deduct'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
