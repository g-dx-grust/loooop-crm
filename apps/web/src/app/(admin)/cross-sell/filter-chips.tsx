'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PRODUCT_TYPE_LABELS, CROSS_SELL_STATUS_LABELS } from '@/lib/status-labels';
import { PRODUCT_TYPES, CROSS_SELL_STATUSES, INTEREST_RANKS } from '@/lib/constants';

export function CrossSellFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentProduct = searchParams.get('productType') ?? '';
  const currentStatus = searchParams.get('status') ?? '';
  const currentRank = searchParams.get('interestRank') ?? '';
  const currentOverdue = searchParams.get('overdue') === '1';

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/cross-sell?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-border bg-bg-subtle">
      {/* Product type chips */}
      <div className="flex items-center gap-1 text-xs text-text-tertiary mr-1">商材:</div>
      {(PRODUCT_TYPES as readonly string[]).map((pt) => {
        const active = currentProduct === pt;
        return (
          <button
            key={pt}
            type="button"
            onClick={() => setFilter('productType', active ? '' : pt)}
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors',
              active
                ? 'bg-brand-primarySoft text-brand-primary font-medium'
                : 'bg-white border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary',
            )}
          >
            {PRODUCT_TYPE_LABELS[pt] ?? pt}
            {active && (
              <X className="size-3" aria-hidden />
            )}
          </button>
        );
      })}

      <span className="w-px bg-border mx-1" />

      {/* Status chips */}
      <div className="flex items-center gap-1 text-xs text-text-tertiary mr-1">ステータス:</div>
      {(CROSS_SELL_STATUSES as readonly string[]).map((s) => {
        const active = currentStatus === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setFilter('status', active ? '' : s)}
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors',
              active
                ? 'bg-brand-primarySoft text-brand-primary font-medium'
                : 'bg-white border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary',
            )}
          >
            {CROSS_SELL_STATUS_LABELS[s] ?? s}
            {active && <X className="size-3" aria-hidden />}
          </button>
        );
      })}

      <span className="w-px bg-border mx-1" />

      {/* Interest rank chips */}
      <div className="flex items-center gap-1 text-xs text-text-tertiary mr-1">見込み度:</div>
      {(INTEREST_RANKS as readonly string[]).map((r) => {
        const active = currentRank === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => setFilter('interestRank', active ? '' : r)}
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors',
              active
                ? 'bg-brand-primarySoft text-brand-primary font-medium'
                : 'bg-white border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary',
            )}
          >
            {r}
            {active && <X className="size-3" aria-hidden />}
          </button>
        );
      })}

      <span className="w-px bg-border mx-1" />

      {/* Overdue quick filter */}
      <button
        type="button"
        onClick={() => setFilter('overdue', currentOverdue ? '' : '1')}
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded px-2 text-xs transition-colors',
          currentOverdue
            ? 'font-medium'
            : 'bg-white border border-border text-text-secondary hover:text-[#FF7D00] hover:border-[#FF7D00]',
        )}
        style={
          currentOverdue
            ? { backgroundColor: '#FFF3E0', color: '#FF7D00', borderWidth: 0 }
            : undefined
        }
      >
        期限超過のみ
        {currentOverdue && <X className="size-3" aria-hidden />}
      </button>
    </div>
  );
}
