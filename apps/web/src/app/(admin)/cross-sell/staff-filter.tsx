'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CrossSellStaffOption } from './queries';

interface Props {
  staffOptions: CrossSellStaffOption[];
  currentStaffId: string;
}

export function CrossSellStaffFilter({ staffOptions, currentStaffId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(staffId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (staffId) {
      params.set('staffId', staffId);
    } else {
      params.delete('staffId');
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-subtle">
      <span className="text-xs text-text-tertiary whitespace-nowrap">担当者</span>
      <select
        value={currentStaffId}
        onChange={(e) => handleChange(e.target.value)}
        className="h-7 rounded border border-border bg-white px-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
      >
        <option value="">全担当者</option>
        {staffOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
