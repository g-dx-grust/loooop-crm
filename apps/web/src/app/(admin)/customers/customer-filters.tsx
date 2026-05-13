'use client';

// Client component: state + URL searchParams updates

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { LOOOP_STATUSES } from '@/lib/constants';

interface FilterChip {
  key: string;
  label: string;
  param: string;
  value: string;
}

const QUICK_CHIPS: FilterChip[] = [
  { key: 'hasConsent', label: '同意あり', param: 'hasConsent', value: '1' },
  { key: 'pinConfirmed', label: 'ピン確認済み', param: 'pinConfirmed', value: '1' },
  { key: 'includeCancelled', label: 'キャンセル含む', param: 'includeCancelled', value: '1' },
];

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Sheet({ open, onClose, children, title }: SheetProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-label={title}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-96 flex-col border-l border-border bg-bg-base shadow-overlay">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <span className="text-h1 text-text-primary">{title}</span>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded hover:bg-bg-subtle"
            aria-label="閉じる"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

interface CustomerFiltersProps {
  events: { id: string; eventName: string; venueName: string | null; eventDate: string | null }[];
  staff: { id: string; displayName: string }[];
}

export function CustomerFilters({ events, staff }: CustomerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Controlled search input
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      // Reset page on filter change
      params.delete('page');
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam({ search: value });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleChip = (chip: FilterChip) => {
    const current = searchParams.get(chip.param);
    updateParam({ [chip.param]: current === chip.value ? null : chip.value });
  };

  const isChipActive = (chip: FilterChip) => searchParams.get(chip.param) === chip.value;

  // Sheet filter state (controlled separately, applied on submit)
  const [sheetEventId, setSheetEventId] = useState(searchParams.get('eventId') ?? '');
  const [sheetStaffId, setSheetStaffId] = useState(searchParams.get('staffId') ?? '');
  const [sheetLooopStatus, setSheetLooopStatus] = useState(searchParams.get('looopStatus') ?? '');

  const applySheetFilters = () => {
    updateParam({
      eventId: sheetEventId || null,
      staffId: sheetStaffId || null,
      looopStatus: sheetLooopStatus || null,
    });
    setSheetOpen(false);
  };

  const clearSheetFilters = () => {
    setSheetEventId('');
    setSheetStaffId('');
    setSheetLooopStatus('');
    updateParam({ eventId: null, staffId: null, looopStatus: null });
    setSheetOpen(false);
  };

  const hasSheetFilters =
    searchParams.has('eventId') || searchParams.has('staffId') || searchParams.has('looopStatus');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-base px-6 py-3">
        {/* Search */}
        <div className="relative flex w-64 items-center">
          <Search className="absolute left-2.5 size-4 text-text-tertiary" aria-hidden />
          <Input
            type="search"
            placeholder="フリーワード検索"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
            aria-label="顧客を検索"
          />
        </div>

        {/* Quick chips */}
        {QUICK_CHIPS.map((chip) => {
          const active = isChipActive(chip);
          return (
            <button
              key={chip.key}
              onClick={() => toggleChip(chip)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded border px-2.5 text-xs transition-colors',
                active
                  ? 'border-brand-primary bg-brand-primarySoft text-brand-primary'
                  : 'border-border bg-white text-text-secondary hover:bg-bg-subtle',
              )}
            >
              {chip.label}
              {active ? <X className="size-3" aria-hidden /> : null}
            </button>
          );
        })}

        {/* Advanced filter button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSheetEventId(searchParams.get('eventId') ?? '');
            setSheetStaffId(searchParams.get('staffId') ?? '');
            setSheetLooopStatus(searchParams.get('looopStatus') ?? '');
            setSheetOpen(true);
          }}
          className={cn(hasSheetFilters && 'border-brand-primary text-brand-primary')}
        >
          <SlidersHorizontal className="size-4" />
          絞り込み
          {hasSheetFilters ? (
            <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-brand-primary text-[10px] text-white">
              {[searchParams.get('eventId'), searchParams.get('staffId'), searchParams.get('looopStatus')].filter(Boolean).length}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Advanced filter sheet */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="絞り込み">
        <div className="space-y-5">
          {/* Event */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              会場
            </label>
            <select
              value={sheetEventId}
              onChange={(e) => setSheetEventId(e.target.value)}
              className="flex h-8 w-full rounded border border-border bg-white px-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="">すべての会場</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.eventName}
                  {ev.venueName ? ` (${ev.venueName})` : ''}
                  {ev.eventDate ? ` ${ev.eventDate}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Staff */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              担当者
            </label>
            <select
              value={sheetStaffId}
              onChange={(e) => setSheetStaffId(e.target.value)}
              className="flex h-8 w-full rounded border border-border bg-white px-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="">すべての担当者</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Looop status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Looopステータス
            </label>
            <select
              value={sheetLooopStatus}
              onChange={(e) => setSheetLooopStatus(e.target.value)}
              className="flex h-8 w-full rounded border border-border bg-white px-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="">すべて</option>
              {LOOOP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LOOOP_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={applySheetFilters} className="flex-1">
              適用
            </Button>
            <Button variant="secondary" size="sm" onClick={clearSheetFilters}>
              クリア
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

// Looop status Japanese labels
export const LOOOP_STATUS_LABELS: Record<string, string> = {
  not_proposed: '未提案',
  proposed: '提案済み',
  interested: '興味あり',
  applied: '申込済み',
  under_review: '審査中',
  contracted: '契約完了',
  opened: '開通済み',
  cancelled: 'キャンセル',
  excluded: '対象外',
};
