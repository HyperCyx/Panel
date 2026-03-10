'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone, Zap, RefreshCw, Loader2, ChevronDown,
  Copy, Check, Phone, AlertCircle, Clock,
} from 'lucide-react';
import { allocateNumber, getUserAllocatedNumbers } from '@/app/actions';
import type { AllocatedNumberInfo } from '@/lib/types';

interface GetNumberProps {
  userId: string;
  currency?: string;
  otpRate?: number;
}

type RecordFilter = 'all' | 'success' | 'pending' | 'expired';

function StatusBadge({ status }: { status: string }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    expired: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status}
    </span>
  );
}

function CountdownTimer({ expiresAt, status }: { expiresAt: string; status: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status !== 'pending') {
      setTimeLeft(status === 'success' ? 'Done' : 'Expired');
      return;
    }

    const update = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const isExpired = timeLeft === 'Expired';
  const isDone = timeLeft === 'Done';

  return (
    <span className={`text-xs font-mono font-bold ${
      isDone ? 'text-emerald-600' : isExpired ? 'text-muted-foreground' : 'text-amber-600'
    }`}>
      {!isDone && !isExpired && <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />}
      {timeLeft}
    </span>
  );
}

export function GetNumber({ userId, currency = '৳', otpRate = 0.50 }: GetNumberProps) {
  const [rangeInput, setRangeInput] = useState('');
  const [gettingNumber, setGettingNumber] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Records from DB (per-user allocated numbers)
  const [records, setRecords] = useState<AllocatedNumberInfo[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all');
  const [perPage, setPerPage] = useState(15);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showPerPageDropdown, setShowPerPageDropdown] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const result = await getUserAllocatedNumbers();
      if (result.data) {
        setRecords(result.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Auto-refresh every 30 seconds to update expired statuses
  useEffect(() => {
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  // Load saved range from browser cookie on mount
  useEffect(() => {
    const cookieName = `range_pref_${userId}`;
    const match = document.cookie.split('; ').find(row => row.startsWith(`${cookieName}=`));
    if (match) {
      setRangeInput(decodeURIComponent(match.split('=')[1]));
    }
  }, [userId]);

  const saveRangeCookie = (value: string) => {
    const cookieName = `range_pref_${userId}`;
    document.cookie = `${cookieName}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
  };

  const handleGetNumber = async () => {
    if (!rangeInput.trim()) {
      setError('Enter the range');
      return;
    }
    setGettingNumber(true);
    setError(null);
    try {
      const result = await allocateNumber(rangeInput.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.success && result.number) {
        // Auto-copy the generated number to clipboard
        navigator.clipboard.writeText(result.number);
        setCopied(result.number);
        setTimeout(() => setCopied(null), 2000);
        // Refresh records to show the new number
        await fetchRecords();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setGettingNumber(false);
    }
  };

  const handleCopy = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopied(number);
    setTimeout(() => setCopied(null), 2000);
  };

  // Compute real-time status (check if expired based on timer)
  const getEffectiveStatus = (rec: AllocatedNumberInfo): 'pending' | 'success' | 'expired' => {
    if (rec.status === 'success') return 'success';
    if (rec.status === 'expired') return 'expired';
    if (new Date(rec.expiresAt).getTime() <= Date.now()) return 'expired';
    return 'pending';
  };

  const filteredRecords = records.filter(r => {
    if (recordFilter === 'all') return true;
    return getEffectiveStatus(r) === recordFilter;
  });

  const paginatedRecords = filteredRecords.slice(0, perPage);

  const filterLabel: Record<RecordFilter, string> = {
    all: 'All Records',
    success: 'Success',
    pending: 'Pending',
    expired: 'Expired',
  };

  return (
    <div className="space-y-5">
      {/* ── YOUR CHOICE RANGE ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">Your Choice Range</h3>
        </div>

        {/* Range Input */}
        <div className="mb-4">
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => { setRangeInput(e.target.value); saveRangeCookie(e.target.value); setError(null); }}
            placeholder="Enter the range"
            className={`w-full px-4 py-3.5 rounded-xl border bg-muted text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary transition ${
              error ? 'border-red-300 focus:ring-red-500/30' : 'border-border focus:ring-ring/30'
            }`}
          />
          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-red-500">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Get Number Button */}
        <button
          onClick={handleGetNumber}
          disabled={gettingNumber}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-lg uppercase tracking-wider shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {gettingNumber ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Zap className="h-6 w-6" />
          )}
          {gettingNumber ? 'Getting...' : 'GET NUMBER'}
        </button>

        {/* Cost Info */}
        <p className="text-center text-xs text-muted-foreground mt-2">
          Cost per number: <span className="font-semibold text-foreground">{currency} {otpRate.toFixed(2)}</span>
        </p>


      </div>

      {/* ── MY NUMBERS TABLE ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">My Numbers</h3>
          <span className="text-xs text-muted-foreground ml-auto">{records.length} total</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3 mb-4">
          {/* Filter dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:border-primary/30 transition"
            >
              <span>{filterLabel[recordFilter]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {showFilterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20">
                {(Object.keys(filterLabel) as RecordFilter[]).map((f, i, arr) => (
                  <button
                    key={f}
                    onClick={() => { setRecordFilter(f); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition ${
                      recordFilter === f ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                    } ${i === 0 ? 'rounded-t-lg' : ''} ${i === arr.length - 1 ? 'rounded-b-lg' : ''}`}
                  >
                    {filterLabel[f]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchRecords}
            disabled={loadingRecords}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Phone &<br/>Status</th>
                <th className="pb-3 pr-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">OTP /<br/>SMS</th>
                <th className="pb-3 pr-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Country /<br/>Operator</th>
                <th className="pb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Timer /<br/>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-muted-foreground font-medium">
                    No Records Found
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const effectiveStatus = getEffectiveStatus(rec);
                  const displayNumber = rec.number;
                  return (
                    <tr key={rec.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-mono font-semibold text-foreground truncate">{displayNumber}</p>
                          <button
                            onClick={() => handleCopy(displayNumber)}
                            className={`p-1 rounded transition-all flex-shrink-0 ${
                              copied === displayNumber ? 'text-emerald-600' : 'text-muted-foreground hover:text-primary'
                            }`}
                          >
                            {copied === displayNumber ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <StatusBadge status={effectiveStatus} />
                      </td>
                      <td className="py-3 pr-3">
                        <p className="text-xs font-mono font-bold text-primary truncate">{rec.otp || '—'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] sm:max-w-[160px] truncate">
                          {rec.sms ? rec.sms.substring(0, 60) + (rec.sms.length > 60 ? '…' : '') : '—'}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        {/* Mobile: only the country portion before " - " */}
                        <p className="text-xs font-medium text-foreground sm:hidden truncate max-w-[80px]">
                          {(rec.country || '—').split(' - ')[0]}
                        </p>
                        {/* Desktop: full country + operator detail */}
                        <p className="hidden sm:block text-xs font-medium text-foreground truncate">{rec.country || '—'}</p>
                        <p className="hidden sm:block text-[10px] text-muted-foreground truncate">{rec.operator || '—'}</p>
                      </td>
                      <td className="py-3">
                        <CountdownTimer expiresAt={rec.expiresAt} status={effectiveStatus} />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(rec.allocatedAt).toLocaleString(undefined, {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
          {/* Per page */}
          <div className="relative">
            <button
              onClick={() => setShowPerPageDropdown(!showPerPageDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:border-primary/30 transition"
            >
              Show {perPage}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {showPerPageDropdown && (
              <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg z-20">
                {[15, 30, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setPerPage(n); setShowPerPageDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/10 transition ${
                      perPage === n ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
