'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';

const TABS = [
  { value: '', label: '全件' },
  { value: 'proposed', label: '提案中' },
  { value: 'applied', label: '申込中' },
  { value: 'contracted', label: '契約済' },
  { value: 'opened', label: '開通済' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

export function LooopStatusTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('status') ?? '';

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('status', value);
    } else {
      params.delete('status');
    }
    router.push(`/looop?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 border-b border-border px-6">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => handleClick(tab.value)}
          className={cn(
            'h-9 px-3 text-sm transition-colors',
            current === tab.value
              ? 'border-b-2 border-brand-primary text-brand-primary font-medium'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
