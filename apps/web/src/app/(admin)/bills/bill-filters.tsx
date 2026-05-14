'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LOOOP_PAYMENT_METHODS } from '@/lib/constants';
import { LOOOP_PAYMENT_METHOD_LABELS } from '@/lib/status-labels';
import type { StaffOption } from './queries';

interface Props {
  staff: StaffOption[];
}

export function BillFilters({ staff }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const month = params.get('month') ?? '';
  const staffId = params.get('staff') ?? '';
  const paymentMethod = params.get('method') ?? '';
  const refundOnly = params.get('refund') === '1';

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/bills?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border bg-bg-base px-4 py-3 lg:px-6">
      <div>
        <label htmlFor="filter-month" className="block text-xs text-text-tertiary">
          対象月
        </label>
        <input
          id="filter-month"
          type="month"
          value={month}
          onChange={(e) => update('month', e.target.value)}
          className="mt-1 h-8 rounded border border-border bg-white px-2 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
        />
      </div>
      <div>
        <label htmlFor="filter-staff" className="block text-xs text-text-tertiary">
          担当者
        </label>
        <select
          id="filter-staff"
          value={staffId}
          onChange={(e) => update('staff', e.target.value)}
          className="mt-1 h-8 rounded border border-border bg-white px-2 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
        >
          <option value="">すべて</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-method" className="block text-xs text-text-tertiary">
          支払方法
        </label>
        <select
          id="filter-method"
          value={paymentMethod}
          onChange={(e) => update('method', e.target.value)}
          className="mt-1 h-8 rounded border border-border bg-white px-2 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
        >
          <option value="">すべて</option>
          {LOOOP_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {LOOOP_PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex h-8 items-center gap-1.5 rounded border border-border bg-white px-3 text-sm text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={refundOnly}
          onChange={(e) => update('refund', e.target.checked ? '1' : '')}
          className="size-3.5 rounded border-border"
        />
        返還対象のみ
      </label>
    </div>
  );
}
