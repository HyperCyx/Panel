'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone, Zap, RefreshCw, Loader2, ChevronDown,
  Copy, Check, Phone, AlertCircle, Clock,
} from 'lucide-react';
import { allocateNumber, getUserAllocatedNumbers, checkNumberOtp } from '@/app/actions';
import type { AllocatedNumberInfo } from '@/lib/types';

interface GetNumberProps {
  userId: string;
  currency?: string;
  otpRate?: number;
  otpCheckInterval?: number;
  cooldown?: number;
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

export function GetNumber({ userId, currency = '৳', otpRate = 0.50, otpCheckInterval = 5, cooldown = 5 }: GetNumberProps) {
  const [rangeInput, setRangeInput] = useState('');
  const [gettingNumber, setGettingNumber] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Records from DB (per-user allocated numbers)
  const [records, setRecords] = useState<AllocatedNumberInfo[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7days'>('today');
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
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

  // OTP auto-polling for pending numbers
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const isPollingRef = useRef(false);

  useEffect(() => {
    const intervalMs = Math.max(3, otpCheckInterval) * 1000;
    let active = true;

    const pollPendingNumbers = async () => {
      if (!active || isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        // Mark locally-expired records immediately so they're never re-checked
        const now = Date.now();
        const expiredIds: string[] = [];
        const pollableRecords: AllocatedNumberInfo[] = [];

        for (const r of recordsRef.current) {
          if (r.status === 'expired') continue;
          if (r.status !== 'pending' && r.status !== 'success') continue;
          if (new Date(r.expiresAt).getTime() <= now) {
            if (r.status === 'pending') expiredIds.push(r.id);
            continue;
          }
          pollableRecords.push(r);
        }

        // Update expired records in local state right away
        if (expiredIds.length > 0) {
          setRecords(prev => prev.map(r =>
            expiredIds.includes(r.id) ? { ...r, status: 'expired' as const } : r
          ));
        }

        if (pollableRecords.length === 0) return;

        for (const rec of pollableRecords) {
          if (!active) break;
          // Skip if expired during this loop iteration
          if (new Date(rec.expiresAt).getTime() <= Date.now()) continue;
          try {
            const result = await checkNumberOtp(rec.id);
            if (result.status === 'success' && result.otp) {
              setRecords(prev => prev.map(r =>
                r.id === rec.id
                  ? { ...r, status: 'success' as const, otp: result.otp, sms: result.sms, otpList: result.otpList }
                  : r
              ));
            } else if (result.status === 'expired') {
              setRecords(prev => prev.map(r =>
                r.id === rec.id ? { ...r, status: 'expired' as const } : r
              ));
            }
          } catch {
            // silently fail
          }
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(pollPendingNumbers, intervalMs);
    pollPendingNumbers();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [otpCheckInterval]);

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
      const cleanRange = rangeInput.trim();
      const result = await allocateNumber(cleanRange);
      if (result.error) {
        setError(result.error);
      } else if (result.success && result.number) {
        setRecordFilter('all');
        if (cooldown > 0) {
          setCooldownRemaining(cooldown);
          const interval = setInterval(() => {
            setCooldownRemaining((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        try { navigator.clipboard.writeText(result.number); } catch {}
        setCopied(result.number);
        setTimeout(() => setCopied(null), 2000);
        await fetchRecords();
      } else {
        setError('Failed to get a number. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setGettingNumber(false);
    }
  };

  const handleCopy = (number: string) => {
    try { navigator.clipboard.writeText(number); } catch {}
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
    if (recordFilter !== 'all' && getEffectiveStatus(r) !== recordFilter) return false;
    
    const allocatedTime = new Date(r.allocatedAt).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    
    if (dateFilter === 'today') {
      if (allocatedTime < todayStart) return false;
    } else if (dateFilter === 'yesterday') {
      if (allocatedTime < yesterdayStart || allocatedTime >= todayStart) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / perPage));
  const startIndex = (currentPage - 1) * perPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + perPage);

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [recordFilter, dateFilter, perPage]);

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
          disabled={gettingNumber || cooldownRemaining > 0 || !rangeInput.trim()}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-lg uppercase tracking-wider shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {gettingNumber ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : cooldownRemaining > 0 ? (
            <Clock className="h-6 w-6" />
          ) : (
            <Zap className="h-6 w-6" />
          )}
          {gettingNumber 
            ? 'Getting...' 
            : cooldownRemaining > 0 
              ? `Wait ${cooldownRemaining}s` 
              : 'GET NUMBER'}
        </button>

        {/* Cost Info */}
        <p className="text-center text-xs text-muted-foreground mt-2">
          Cost per number: <span className="font-semibold text-foreground">{currency} {otpRate.toFixed(2)}</span>
        </p>


      </div>

      {/* ── MY NUMBERS TABLE ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-primary">My Numbers</h3>
          <span className="text-xs text-muted-foreground ml-auto">{records.length} total</span>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
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

            {/* Date dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:border-primary/30 transition"
              >
                <span>{dateFilter === 'today' ? 'Today' : dateFilter === 'yesterday' ? 'Yesterday' : 'Last 7 Days'}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {showDateDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20">
                  {(['today', 'yesterday', 'last7days'] as const).map((f, i, arr) => (
                    <button
                      key={f}
                      onClick={() => { setDateFilter(f); setShowDateDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition ${
                        dateFilter === f ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                      } ${i === 0 ? 'rounded-t-lg' : ''} ${i === arr.length - 1 ? 'rounded-b-lg' : ''}`}
                    >
                      {f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : 'Last 7 Days'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchRecords}
            disabled={loadingRecords}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Records */}
        <div className="space-y-3">
          {loadingRecords ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading records...</span>
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground font-medium">
              No Records Found
            </div>
          ) : (
            paginatedRecords.map((rec) => {
              const effectiveStatus = getEffectiveStatus(rec);
              const displayNumber = rec.number;

              const borderColor =
                effectiveStatus === 'success'
                  ? 'border-emerald-400'
                  : effectiveStatus === 'expired'
                  ? 'border-red-400'
                  : 'border-amber-400';

              const bgColor =
                effectiveStatus === 'success'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                  : effectiveStatus === 'expired'
                  ? 'bg-red-50/50 dark:bg-red-950/20'
                  : 'bg-amber-50/50 dark:bg-amber-950/20';

              const leftAccent =
                effectiveStatus === 'success'
                  ? 'bg-emerald-400'
                  : effectiveStatus === 'expired'
                  ? 'bg-red-400'
                  : 'bg-amber-400';

              return (
                <div
                  key={rec.id}
                  className={`relative rounded-xl border-2 ${borderColor} ${bgColor} overflow-hidden transition-all`}
                >
                  {/* Left color accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftAccent}`} />

                  <div className="pl-4 pr-3 py-3">
                    {/* Top row: Phone + Copy | Status + Timer */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-mono font-bold text-foreground truncate">{displayNumber}</p>
                          <button
                            onClick={() => handleCopy(displayNumber)}
                            className={`p-1 rounded transition-all flex-shrink-0 ${
                              copied === displayNumber ? 'text-emerald-600' : 'text-muted-foreground hover:text-primary'
                            }`}
                          >
                            {copied === displayNumber ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={effectiveStatus} />
                        <CountdownTimer expiresAt={rec.expiresAt} status={effectiveStatus} />
                      </div>
                    </div>

                    {/* OTP Codes — show all from otpList */}
                    {rec.otpList && rec.otpList.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {rec.otpList.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopy(item.otp)}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
                              >
                                <span className="font-mono text-base font-extrabold tracking-wider">{item.otp}</span>
                                <span className="text-primary/70">
                                  {copied === item.otp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </span>
                              </button>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(item.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}
                              </span>
                            </div>
                            {item.sms && (
                              <div className="flex items-center gap-1.5 mt-0.5 pl-1">
                                <p className="text-[10px] text-muted-foreground line-clamp-1 flex-1 min-w-0">
                                  {item.sms}
                                </p>
                                <button
                                  onClick={() => handleCopy(item.sms)}
                                  className={`p-1 rounded transition-all flex-shrink-0 ${
                                    copied === item.sms ? 'text-emerald-600' : 'text-muted-foreground hover:text-primary'
                                  }`}
                                  title="Copy full message"
                                >
                                  {copied === item.sms ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : rec.otp ? (
                      <div className="mt-2">
                        <button
                          onClick={() => handleCopy(rec.otp!)}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
                        >
                          <span className="font-mono text-base font-extrabold tracking-wider">{rec.otp}</span>
                          <span className="text-primary/70">
                            {copied === rec.otp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </span>
                        </button>
                      </div>
                    ) : null}

                    {/* Bottom row: Country/Operator | Allocated Time */}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground sm:hidden truncate">
                          {(rec.country || '—').split(' - ')[0]}
                        </p>
                        <p className="hidden sm:block text-xs font-medium text-foreground truncate">{rec.country || '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{rec.operator || '—'}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {new Date(rec.allocatedAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                          timeZone: 'UTC',
                        })}
                      </p>
                    </div>

                    {/* SMS text — only show if no otpList (legacy fallback) */}
                    {rec.sms && (!rec.otpList || rec.otpList.length === 0) && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <p className="text-[10px] text-muted-foreground line-clamp-1 flex-1 min-w-0">
                          {rec.sms}
                        </p>
                        <button
                          onClick={() => handleCopy(rec.sms!)}
                          className={`p-1 rounded transition-all flex-shrink-0 ${
                            copied === rec.sms ? 'text-emerald-600' : 'text-muted-foreground hover:text-primary'
                          }`}
                          title="Copy full message"
                        >
                          {copied === rec.sms ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
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

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 transition"
            >
              Prev
            </button>
            <span className="text-sm text-muted-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
