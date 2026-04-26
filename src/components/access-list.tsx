'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Clock, Globe, Search,
  AlertCircle, ChevronLeft, ChevronRight, ChevronDown,
  MessageCircle, Phone, Mail, Shield, Gamepad2, Wallet,
  ShoppingCart, Music, Video, Landmark, Plane, Briefcase,
} from 'lucide-react';
import { fetchAccessListData } from '@/app/actions';
import type { AccessListRecord } from '@/lib/types';

interface AccessListProps {
  defaultOrigins: string[];
}

const PAGE_SIZE = 20;

// App brand detection: name patterns -> { icon component, bg color, text color, border color }
const APP_BRANDS: { patterns: string[]; label: string; icon: React.ElementType; bg: string; text: string; border: string }[] = [
  { patterns: ['whatsapp'], label: 'WhatsApp', icon: MessageCircle, bg: 'bg-[#25D366]/10', text: 'text-[#25D366]', border: 'border-[#25D366]/30' },
  { patterns: ['telegram', 'tg'], label: 'Telegram', icon: MessageCircle, bg: 'bg-[#26A5E4]/10', text: 'text-[#26A5E4]', border: 'border-[#26A5E4]/30' },
  { patterns: ['facebook', 'fb', 'meta'], label: 'Facebook', icon: Globe, bg: 'bg-[#1877F2]/10', text: 'text-[#1877F2]', border: 'border-[#1877F2]/30' },
  { patterns: ['instagram', 'insta'], label: 'Instagram', icon: Video, bg: 'bg-[#E4405F]/10', text: 'text-[#E4405F]', border: 'border-[#E4405F]/30' },
  { patterns: ['google'], label: 'Google', icon: Search, bg: 'bg-[#4285F4]/10', text: 'text-[#4285F4]', border: 'border-[#4285F4]/30' },
  { patterns: ['twitter', 'x.com'], label: 'X / Twitter', icon: Globe, bg: 'bg-[#1DA1F2]/10', text: 'text-[#1DA1F2]', border: 'border-[#1DA1F2]/30' },
  { patterns: ['tiktok'], label: 'TikTok', icon: Music, bg: 'bg-[#010101]/10', text: 'text-[#010101] dark:text-white', border: 'border-[#010101]/20' },
  { patterns: ['snapchat', 'snap'], label: 'Snapchat', icon: MessageCircle, bg: 'bg-[#FFFC00]/10', text: 'text-[#D4A800]', border: 'border-[#FFFC00]/30' },
  { patterns: ['discord'], label: 'Discord', icon: Gamepad2, bg: 'bg-[#5865F2]/10', text: 'text-[#5865F2]', border: 'border-[#5865F2]/30' },
  { patterns: ['signal'], label: 'Signal', icon: Shield, bg: 'bg-[#3A76F0]/10', text: 'text-[#3A76F0]', border: 'border-[#3A76F0]/30' },
  { patterns: ['viber'], label: 'Viber', icon: Phone, bg: 'bg-[#7360F2]/10', text: 'text-[#7360F2]', border: 'border-[#7360F2]/30' },
  { patterns: ['line'], label: 'LINE', icon: MessageCircle, bg: 'bg-[#00C300]/10', text: 'text-[#00C300]', border: 'border-[#00C300]/30' },
  { patterns: ['wechat', 'weixin'], label: 'WeChat', icon: MessageCircle, bg: 'bg-[#07C160]/10', text: 'text-[#07C160]', border: 'border-[#07C160]/30' },
  { patterns: ['binance'], label: 'Binance', icon: Wallet, bg: 'bg-[#F0B90B]/10', text: 'text-[#C99A00]', border: 'border-[#F0B90B]/30' },
  { patterns: ['bitget'], label: 'Bitget', icon: Wallet, bg: 'bg-[#00CEA6]/10', text: 'text-[#00CEA6]', border: 'border-[#00CEA6]/30' },
  { patterns: ['coinbase'], label: 'Coinbase', icon: Wallet, bg: 'bg-[#0052FF]/10', text: 'text-[#0052FF]', border: 'border-[#0052FF]/30' },
  { patterns: ['bybit'], label: 'Bybit', icon: Wallet, bg: 'bg-[#F7A600]/10', text: 'text-[#C98800]', border: 'border-[#F7A600]/30' },
  { patterns: ['okx', 'okex'], label: 'OKX', icon: Wallet, bg: 'bg-[#000000]/10', text: 'text-[#000000] dark:text-white', border: 'border-[#000000]/20' },
  { patterns: ['paypal'], label: 'PayPal', icon: Wallet, bg: 'bg-[#003087]/10', text: 'text-[#003087]', border: 'border-[#003087]/30' },
  { patterns: ['amazon'], label: 'Amazon', icon: ShoppingCart, bg: 'bg-[#FF9900]/10', text: 'text-[#CC7A00]', border: 'border-[#FF9900]/30' },
  { patterns: ['uber'], label: 'Uber', icon: Briefcase, bg: 'bg-[#000000]/10', text: 'text-[#000000] dark:text-white', border: 'border-[#000000]/20' },
  { patterns: ['microsoft', 'outlook', 'hotmail'], label: 'Microsoft', icon: Mail, bg: 'bg-[#00A4EF]/10', text: 'text-[#00A4EF]', border: 'border-[#00A4EF]/30' },
  { patterns: ['apple', 'icloud'], label: 'Apple', icon: Globe, bg: 'bg-[#555555]/10', text: 'text-[#555555] dark:text-gray-300', border: 'border-[#555555]/20' },
  { patterns: ['netflix'], label: 'Netflix', icon: Video, bg: 'bg-[#E50914]/10', text: 'text-[#E50914]', border: 'border-[#E50914]/30' },
  { patterns: ['spotify'], label: 'Spotify', icon: Music, bg: 'bg-[#1DB954]/10', text: 'text-[#1DB954]', border: 'border-[#1DB954]/30' },
  { patterns: ['youtube'], label: 'YouTube', icon: Video, bg: 'bg-[#FF0000]/10', text: 'text-[#FF0000]', border: 'border-[#FF0000]/30' },
  { patterns: ['linkedin'], label: 'LinkedIn', icon: Briefcase, bg: 'bg-[#0A66C2]/10', text: 'text-[#0A66C2]', border: 'border-[#0A66C2]/30' },
  { patterns: ['tinder'], label: 'Tinder', icon: Globe, bg: 'bg-[#FE3C72]/10', text: 'text-[#FE3C72]', border: 'border-[#FE3C72]/30' },
  { patterns: ['yahoo'], label: 'Yahoo', icon: Mail, bg: 'bg-[#6001D2]/10', text: 'text-[#6001D2]', border: 'border-[#6001D2]/30' },
  { patterns: ['twitch'], label: 'Twitch', icon: Gamepad2, bg: 'bg-[#9146FF]/10', text: 'text-[#9146FF]', border: 'border-[#9146FF]/30' },
  { patterns: ['grab'], label: 'Grab', icon: Briefcase, bg: 'bg-[#00B14F]/10', text: 'text-[#00B14F]', border: 'border-[#00B14F]/30' },
  { patterns: ['airbnb'], label: 'Airbnb', icon: Plane, bg: 'bg-[#FF5A5F]/10', text: 'text-[#FF5A5F]', border: 'border-[#FF5A5F]/30' },
  { patterns: ['wise', 'transferwise'], label: 'Wise', icon: Landmark, bg: 'bg-[#9FE870]/10', text: 'text-[#37A800]', border: 'border-[#9FE870]/30' },
];

function detectBrand(origin: string) {
  if (!origin) return null;
  const lower = origin.toLowerCase();
  return APP_BRANDS.find((b) => b.patterns.some((p) => lower.includes(p))) ?? null;
}

function AppBadge({ origin }: { origin: string }) {
  const brand = detectBrand(origin);
  if (brand) {
    const Icon = brand.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${brand.bg} ${brand.text} ${brand.border}`}>
        <Icon className="h-3.5 w-3.5" />
        {brand.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-muted text-muted-foreground border-border">
      <Globe className="h-3.5 w-3.5" />
      {origin || 'Unknown'}
    </span>
  );
}

function formatDatetime(dt: string) {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dt;
  }
}

function timeAgo(dt: string) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function freshnessColor(dt: string) {
  if (!dt) return 'border-border';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return 'border-border';
    const hours = (Date.now() - d.getTime()) / 3600000;
    if (hours < 1) return 'border-emerald-400';
    if (hours < 6) return 'border-emerald-300';
    if (hours < 24) return 'border-amber-300';
    return 'border-red-300';
  } catch {
    return 'border-border';
  }
}

function freshnessLabel(dt: string) {
  if (!dt) return { text: 'Unknown', color: 'text-muted-foreground bg-muted' };
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return { text: 'Unknown', color: 'text-muted-foreground bg-muted' };
    const hours = (Date.now() - d.getTime()) / 3600000;
    if (hours < 1) return { text: 'Active', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (hours < 6) return { text: 'Recent', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (hours < 24) return { text: 'Today', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { text: 'Stale', color: 'text-red-600 bg-red-50 border-red-200' };
  } catch {
    return { text: 'Unknown', color: 'text-muted-foreground bg-muted' };
  }
}

export function AccessList({ defaultOrigins }: AccessListProps) {
  const [records, setRecords] = useState<AccessListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [manualSearching, setManualSearching] = useState(false);

  const fetchAllOrigins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = defaultOrigins.length > 0
        ? defaultOrigins.map((origin) => fetchAccessListData({ origin }))
        : [fetchAccessListData({})];

      const results = await Promise.all(promises);

      const allRecords: AccessListRecord[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.error) {
          errors.push(result.error);
        } else if (result.data) {
          allRecords.push(...result.data);
        }
      }

      if (allRecords.length === 0 && errors.length > 0) {
        setError(errors[0]);
        setRecords([]);
      } else {
        allRecords.sort((a, b) => {
          const at = new Date(a.datetime).getTime() || 0;
          const bt = new Date(b.datetime).getTime() || 0;
          return bt - at;
        });
        setRecords(allRecords);
      }
    } catch {
      setError('Failed to fetch access list data.');
      setRecords([]);
    }
    setLoading(false);
  }, [defaultOrigins]);

  const handleManualSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setManualSearching(true);
    setError(null);
    setExpandedIdx(null);
    setPage(1);
    try {
      const result = await fetchAccessListData({ origin: trimmed });
      if (result.error) {
        setError(result.error);
        setRecords([]);
      } else {
        const data = result.data || [];
        data.sort((a, b) => {
          const at = new Date(a.datetime).getTime() || 0;
          const bt = new Date(b.datetime).getTime() || 0;
          return bt - at;
        });
        setRecords(data);
      }
    } catch {
      setError('Failed to search access list.');
      setRecords([]);
    }
    setManualSearching(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchAllOrigins();
  }, [fetchAllOrigins]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const paginatedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    setExpandedIdx(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAnyLoading = loading || manualSearching;

  return (
    <div className="space-y-5">
      {/* Search Bar — always visible */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by origin name (e.g., WhatsApp, Binance)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={handleManualSearch}
            disabled={isAnyLoading || !searchQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
          >
            {manualSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
          <button
            onClick={() => { setSearchQuery(''); fetchAllOrigins(); }}
            disabled={isAnyLoading}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all shrink-0"
            title="Reset to defaults"
          >
            <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {records.length > 0 && !isAnyLoading && (
          <div className="mt-3 px-0.5">
            <p className="text-[11px] text-muted-foreground">
              {records.length} record{records.length !== 1 ? 's' : ''}
              <span className="mx-1">·</span>
              Page {page} of {totalPages}
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isAnyLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              {manualSearching ? 'Searching...' : 'Loading latest access data...'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isAnyLoading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load access list</p>
            <p className="text-xs text-destructive/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isAnyLoading && !error && records.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No access records found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try searching for a specific origin or click the refresh button.
          </p>
        </div>
      )}

      {/* Records List */}
      {!isAnyLoading && !error && paginatedRecords.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {paginatedRecords.map((rec, idx) => {
            const dest = rec.accessDestination || 'Unknown';
            const freshness = freshnessLabel(rec.datetime);
            const borderColor = freshnessColor(rec.datetime);
            const key = `${page}-${idx}`;
            const isExpanded = expandedIdx === key;

            return (
              <div
                key={key}
                className={`bg-card rounded-2xl border-l-4 border border-border shadow-sm transition-all overflow-hidden ${borderColor}`}
              >
                {/* Clickable Header */}
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : key)}
                  className="w-full text-left p-3.5 sm:p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* App Origin Badge */}
                      <div className="mb-2">
                        <AppBadge origin={rec.accessOrigin} />
                      </div>
                      {/* Destination */}
                      <div className="flex items-center gap-2 mb-1.5 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate min-w-0">{dest}</h3>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${freshness.color}`}>
                          {freshness.text}
                        </span>
                      </div>
                      {/* Time */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">{timeAgo(rec.datetime) || formatDatetime(rec.datetime)}</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-border px-3.5 sm:px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Origin</span>
                        <span className="font-medium text-foreground">{rec.accessOrigin || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Destination</span>
                        <span className="font-medium text-foreground">{rec.accessDestination || '—'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground block mb-0.5">Datetime</span>
                        <span className="text-foreground">{formatDatetime(rec.datetime)}</span>
                      </div>
                      {rec.comment && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground block mb-0.5">Comment</span>
                          <span className="text-foreground">{rec.comment}</span>
                        </div>
                      )}
                      {rec.message && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground block mb-0.5">Message</span>
                          <span className="text-foreground break-all">{rec.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isAnyLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots');
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'dots' ? (
                <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(item as number)}
                  className={`min-w-[36px] h-9 rounded-xl text-xs font-medium transition-all ${
                    page === item
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
