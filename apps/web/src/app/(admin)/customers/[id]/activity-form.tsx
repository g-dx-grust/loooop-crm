'use client';

// Client component: form for adding an activity

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACTIVITY_TYPES } from '@/lib/constants';
import { addActivity } from './actions';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: '電話',
  visit: '訪問',
  email: 'メール',
  memo: 'メモ',
  status_change: 'ステータス変更',
};

interface ActivityFormProps {
  customerId: string;
}

export function ActivityForm({ customerId }: ActivityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activityType, setActivityType] = useState<string>('call');
  const [content, setContent] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('内容を入力してください');
      contentRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addActivity(customerId, {
          activityType,
          content: content.trim(),
          nextActionDate: nextActionDate || undefined,
        });
        setContent('');
        setNextActionDate('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存に失敗しました');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
      <div className="flex gap-2">
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="h-8 rounded border border-border bg-white px-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
          aria-label="対応種別"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>

        <Input
          type="date"
          value={nextActionDate}
          onChange={(e) => setNextActionDate(e.target.value)}
          placeholder="次回アクション日 (任意)"
          aria-label="次回アクション日"
          className="w-44"
        />
      </div>

      <div>
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="対応内容を入力"
          rows={3}
          aria-label="対応内容"
          aria-invalid={error ? true : undefined}
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
        />
        {error ? (
          <p className="mt-1 text-xs text-status-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" variant="primary" size="sm" loading={isPending} disabled={isPending}>
        記録する
      </Button>
    </form>
  );
}
