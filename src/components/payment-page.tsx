'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Send, Loader2, CheckCircle2, Clock,
  AlertCircle, Copy, Check, Save, ChevronDown,
} from 'lucide-react';
import { createPaymentRequest, getUserPaymentRequests, getUserWallets, saveUserWallets } from '@/app/actions';
import type { PaymentRequestInfo, UserWalletInfo, PaymentMethod } from '@/lib/types';

interface PaymentPageProps {
  userId: string;
  walletBalance: number;
  currency: string;
  paymentNetwork: string;
  minimumWithdrawal: number;
  paymentMethods: PaymentMethod[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    rejected: 'bg-blue-50 text-blue-600 border-blue-200',
    rejected_deducted: 'bg-red-50 text-red-600 border-red-200',
  };
  const labels: Record<string, string> = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected (Refunded)',
    rejected_deducted: 'Rejected',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export function PaymentPage({ userId, walletBalance, currency, paymentNetwork, minimumWithdrawal, paymentMethods }: PaymentPageProps) {
  const enabledMethods = paymentMethods.filter(m => m.enabled);
  // Wallet setup
  const [wallets, setWallets] = useState<UserWalletInfo>({});
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [savingWallets, setSavingWallets] = useState(false);
  const [walletSaveMsg, setWalletSaveMsg] = useState<string | null>(null);

  // Withdrawal form
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // History
  const [records, setRecords] = useState<PaymentRequestInfo[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [balance, setBalance] = useState(walletBalance);

  const fetchWallets = useCallback(async () => {
    setLoadingWallets(true);
    try {
      const result = await getUserWallets();
      if (result.data) setWallets(result.data);
    } catch { /* silent */ } finally {
      setLoadingWallets(false);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const result = await getUserPaymentRequests();
      if (result.data) setRecords(result.data);
    } catch { /* silent */ } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
    fetchRecords();
  }, [fetchWallets, fetchRecords]);

  const handleSaveWallets = async () => {
    setSavingWallets(true);
    setWalletSaveMsg(null);
    try {
      const result = await saveUserWallets(wallets);
      if (result.error) {
        setWalletSaveMsg(result.error);
      } else {
        setWalletSaveMsg('Wallets saved successfully!');
        setTimeout(() => setWalletSaveMsg(null), 3000);
      }
    } catch {
      setWalletSaveMsg('Failed to save wallets.');
    } finally {
      setSavingWallets(false);
    }
  };

  const availableWallets = enabledMethods.filter(m => wallets[m.id]?.trim());
  const selectedWalletInfo = enabledMethods.find(m => m.id === selectedWallet);
  const selectedWalletAddress = selectedWallet ? wallets[selectedWallet] : '';

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedWallet) { setError('Please select a wallet.'); return; }
    if (!selectedWalletAddress) { setError('Selected wallet has no address.'); return; }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) { setError('Enter a valid amount.'); return; }
    if (parsedAmount < minimumWithdrawal) { setError(`Minimum withdrawal is ${currency} ${minimumWithdrawal}.`); return; }
    if (parsedAmount > balance) { setError('Insufficient balance.'); return; }

    setSubmitting(true);
    try {
      const result = await createPaymentRequest({
        amount: parsedAmount,
        walletAddress: selectedWalletAddress,
        walletType: selectedWalletInfo?.name || selectedWallet,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Payment request submitted! Wait for admin approval.');
        setAmount('');
        setBalance(prev => prev - parsedAmount);
        await fetchRecords();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Your Balance</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-4xl font-extrabold text-foreground">{currency} {balance.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">Available for withdrawal</p>
        </div>
      </div>

      {/* Wallet Setup */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Save className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Wallet Setup</h3>
        </div>

        {loadingWallets ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {enabledMethods.map(m => (
              <div key={m.id}>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 block">{m.name}</label>
                <input
                  type={m.fieldType === 'number' ? 'tel' : 'text'}
                  value={wallets[m.id] || ''}
                  onChange={(e) => setWallets(prev => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder={m.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition"
                />
              </div>
            ))}

            {walletSaveMsg && (
              <div className={`flex items-center gap-1.5 ${walletSaveMsg.includes('success') ? 'text-emerald-600' : 'text-red-500'}`}>
                {walletSaveMsg.includes('success') ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                <span className="text-xs font-medium">{walletSaveMsg}</span>
              </div>
            )}

            <button
              onClick={handleSaveWallets}
              disabled={savingWallets}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-sm transition-all disabled:opacity-50"
            >
              {savingWallets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingWallets ? 'Saving...' : 'Save Wallets'}
            </button>
          </div>
        )}
      </div>

      {/* Withdrawal Form */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Send className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Request Withdrawal</h3>
        </div>

        <div className="space-y-4">
          {/* Wallet Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Select Wallet</label>
            {availableWallets.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                Please set up at least one wallet above before requesting a withdrawal.
              </p>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground hover:border-primary/30 transition"
                >
                  <span className={selectedWalletInfo ? 'font-medium truncate' : 'text-muted-foreground'}>
                    {selectedWalletInfo ? `${selectedWalletInfo.name} — ${selectedWalletAddress}` : 'Choose a wallet...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                    {availableWallets.map((m, i) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setSelectedWallet(m.id); setShowDropdown(false); setError(null); }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-primary/10 transition ${
                          selectedWallet === m.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                        } ${i > 0 ? 'border-t border-border/50' : ''}`}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">{wallets[m.id]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">Amount ({currency})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); setSuccess(null); }}
              placeholder={`Min ${minimumWithdrawal}`}
              min={minimumWithdrawal}
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-500">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">{success}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || availableWallets.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base tracking-wide shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
            {submitting ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Payment History</h3>
          <span className="text-xs text-muted-foreground ml-auto">{records.length} total</span>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Amount</th>
                <th className="pb-3 pr-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Wallet</th>
                <th className="pb-3 pr-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="pb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">No payment requests yet</td></tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50">
                    <td className="py-3 pr-3"><p className="text-sm font-bold text-foreground">{rec.currency} {rec.amount.toFixed(2)}</p></td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-xs font-mono text-foreground truncate max-w-[180px]">{rec.walletAddress}</p>
                        <button onClick={() => handleCopy(rec.walletAddress, rec.id)} className="text-muted-foreground hover:text-primary flex-shrink-0">
                          {copiedId === rec.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{rec.network}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={rec.status} />
                      {rec.adminNote && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{rec.adminNote}</p>}
                    </td>
                    <td className="py-3">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(rec.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden space-y-2">
          {loadingRecords ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No payment requests yet</p>
          ) : (
            records.map((rec) => (
              <div key={rec.id} className="border border-border/50 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{rec.currency} {rec.amount.toFixed(2)}</p>
                  <StatusBadge status={rec.status} />
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground truncate">{rec.walletAddress}</p>
                  <button onClick={() => handleCopy(rec.walletAddress, rec.id)} className="text-muted-foreground hover:text-primary flex-shrink-0">
                    {copiedId === rec.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{rec.network}</span>
                  <span>{new Date(rec.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {rec.adminNote && <p className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1">Note: {rec.adminNote}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
