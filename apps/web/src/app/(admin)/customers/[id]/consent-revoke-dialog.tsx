'use client';

// Client component: consent revoke confirmation dialog

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { revokeSolarConsent } from './actions';

interface ConsentRevokeDialogProps {
  customerId: string;
  onClose: () => void;
}

export function ConsentRevokeDialog({ customerId, onClose }: ConsentRevokeDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
      setError('撤回理由を入力してください');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await revokeSolarConsent(customerId, reason.trim());
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : '処理に失敗しました');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal aria-label="同意撤回の確認">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-white p-5 shadow-overlay">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-status-error" aria-hidden />
            <h2 className="text-h1 text-text-primary">同意を撤回する</h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded hover:bg-bg-subtle"
            aria-label="閉じる"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-text-secondary">
          太陽光パートナー提供同意を撤回します。一度撤回すると太陽光連携ができなくなります。この操作は取り消せません。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              撤回理由 <span className="text-status-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="撤回理由を入力してください"
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
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={isPending}
              disabled={isPending}
              className="flex-1"
            >
              撤回する
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
