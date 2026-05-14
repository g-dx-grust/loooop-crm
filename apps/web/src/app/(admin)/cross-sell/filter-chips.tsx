'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PRODUCT_TYPE_LABELS, CROSS_SELL_STATUS_LABELS } from '@/lib/status-labels';
import { PRODUCT_TYPES, CROSS_SELL_STATUSES, INTEREST_RANKS } from '@/lib/constants';

interface ChipGroupProps {
  label: string;
  values: readonly string[];
  getLabel: (v: string) => string;
  current: string;
  onSelect: (v: string) => void;
}

function ChipGroup({ label, values, getLabel, current, onSelect }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="shrink-0 text-xs font-medium text-text-tertiary">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const active = current === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(active ? '' : v)}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded border px-2.5 text-xs transition-colors',
                active
                  ? 'border-brand-primary bg-brand-primarySoft font-medium text-brand-primary'
                  : 'border-border bg-white text-text-secondary hover:border-text-tertiary hover:text-text-primary',
              )}
            >
              {getLabel(v)}
              {active && <X className="size-3" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

  const hasAny = !!(currentProduct || currentStatus || currentRank || currentOverdue);

  return (
    <div className="space-y-2.5 border-b border-border bg-bg-subtle px-4 py-3 lg:px-6">
      <ChipGroup
        label="商材"
        values={PRODUCT_TYPES}
        getLabel={(v) => PRODUCT_TYPE_LABELS[v] ?? v}
        current={currentProduct}
        onSelect={(v) => setFilter('productType', v)}
      />
      <ChipGroup
        label="ステータス"
        values={CROSS_SELL_STATUSES}
        getLabel={(v) => CROSS_SELL_STATUS_LABELS[v] ?? v}
        current={currentStatus}
        onSelect={(v) => setFilter('status', v)}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <ChipGroup
          label="見込み度"
          values={INTEREST_RANKS}
          getLabel={(v) => v}
          current={currentRank}
          onSelect={(v) => setFilter('interestRank', v)}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('overdue', currentOverdue ? '' : '1')}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded border px-2.5 text-xs transition-colors',
              currentOverdue
                ? 'border-status-warning bg-status-warningSoft font-medium text-status-warning'
                : 'border-border bg-white text-text-secondary hover:border-status-warning hover:text-status-warning',
            )}
          >
            期限超過のみ
            {currentOverdue && <X className="size-3" aria-hidden />}
          </button>
          {hasAny && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                router.push(`/cross-sell?${params.toString()}`);
              }}
              className="inline-flex h-7 items-center px-2 text-xs text-text-tertiary transition-colors hover:text-text-primary"
            >
              クリア
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
