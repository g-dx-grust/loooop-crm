'use client';

// Client component: Looop status change modal

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOOOP_STATUSES } from '@/lib/constants';
import { updateLooopStatus } from './actions';
import { LOOOP_STATUS_LABELS } from '../customer-filters';

interface LooopStatusModalProps {
  contractId: string;
  currentStatus: string;
  onClose: () => void;
}

export function LooopStatusModal({ contractId, currentStatus, onClose }: LooopStatusModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('変更理由を入力してください');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateLooopStatus(contractId, status, reason.trim());
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存に失敗しました');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal aria-label="Looopステータス変更">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-white p-5 shadow-overlay">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h1 text-text-primary">Looopステータス変更</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded hover:bg-bg-subtle"
            aria-label="閉じる"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              新しいステータス <span className="text-status-error">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-8 w-full rounded border border-border bg-white px-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {LOOOP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LOOOP_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              変更理由 <span className="text-status-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="変更理由を入力してください"
              className="w-full rounded border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
              aria-invalid={error ? true : undefined}
            />
            {error ? (
              <p className="mt-1 text-xs text-status-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" loading={isPending} disabled={isPending} className="flex-1">
              変更する
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
