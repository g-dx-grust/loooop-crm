'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { LOOOP_STATUS_LABELS, LOOOP_STATUS_TONE, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONE } from '@/lib/status-labels';
import { formatDate, formatCurrency, formatYearMonth } from '@/lib/format';
import { updateLooopStatus } from './actions';
import type { LooopContractListItem } from './queries';
import { LOOOP_STATUSES } from '@/lib/constants';

interface Props {
  contracts: LooopContractListItem[];
}

export function LooopTable({ contracts }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const selected = contracts.find((c) => c.id === selectedId);

  function openSheet(contract: LooopContractListItem) {
    setSelectedId(contract.id);
    setNewStatus(contract.status);
    setReason('');
    setError('');
  }

  function closeSheet() {
    setSelectedId(null);
    setNewStatus('');
    setReason('');
    setError('');
  }

  function handleSave() {
    if (!selectedId) return;
    if ((newStatus === 'cancelled' || newStatus === 'terminated') && !reason.trim()) {
      setError('理由を入力してください');
      return;
    }
    setError('');
    startTransition(async () => {
      const result = await updateLooopStatus(selectedId, newStatus, reason || undefined);
      if (result.success) {
        closeSheet();
      } else {
        setError(result.error ?? '更新に失敗しました');
      }
    });
  }

  return (
    <>
      {/* Mobile card list (< lg) */}
      <ul className="space-y-2 p-3 lg:hidden">
        {contracts.length === 0 ? (
          <li className="rounded border border-border bg-white py-8 text-center text-sm text-text-tertiary">
            データがありません
          </li>
        ) : (
          contracts.map((contract) => (
            <li key={contract.id}>
              <button
                type="button"
                onClick={() => openSheet(contract)}
                className="w-full rounded-lg border border-border bg-white p-3 text-left transition-colors active:bg-bg-subtle"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {contract.customerName}
                    </p>
                    {contract.eventName ? (
                      <p className="mt-0.5 truncate text-xs text-text-tertiary">
                        {contract.eventName}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={LOOOP_STATUS_TONE[contract.status] ?? 'neutral'}>
                    {LOOOP_STATUS_LABELS[contract.status] ?? contract.status}
                  </Badge>
                </div>
                <dl className="mt-2.5 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-text-tertiary">担当</dt>
                  <dd className="truncate text-text-secondary">{contract.staffName ?? '—'}</dd>
                  <dt className="text-text-tertiary">申込日</dt>
                  <dd className="tabular-nums text-text-secondary">{formatDate(contract.applicationDate)}</dd>
                  <dt className="text-text-tertiary">売上単価</dt>
                  <dd className="tabular-nums text-text-primary">{formatCurrency(contract.unitPrice)}</dd>
                  <dt className="text-text-tertiary">計上月</dt>
                  <dd className="tabular-nums text-text-secondary">{formatYearMonth(contract.revenueMonth)}</dd>
                </dl>
                <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-text-tertiary">入金</span>
                  <Badge tone={PAYMENT_STATUS_TONE[contract.paymentStatus] ?? 'neutral'}>
                    {PAYMENT_STATUS_LABELS[contract.paymentStatus] ?? contract.paymentStatus}
                  </Badge>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Desktop table (≥ lg) */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
              <th className="h-9 px-4 text-left font-medium">顧客名</th>
              <th className="h-9 px-4 text-left font-medium">催事会場</th>
              <th className="h-9 px-4 text-left font-medium">担当者</th>
              <th className="h-9 px-4 text-left font-medium">申込日</th>
              <th className="h-9 px-4 text-left font-medium">申込ステータス</th>
              <th className="h-9 px-4 text-right font-medium tabular-nums">売上単価</th>
              <th className="h-9 px-4 text-left font-medium">売上計上月</th>
              <th className="h-9 px-4 text-left font-medium">入金ステータス</th>
              <th className="h-9 px-4 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={9} className="h-10 px-4 text-center text-text-tertiary">
                  データがありません
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="h-10 border-b border-border hover:bg-bg-subtle"
                >
                  <td className="px-4 font-medium text-text-primary">{contract.customerName}</td>
                  <td className="px-4 text-text-secondary">{contract.eventName ?? '—'}</td>
                  <td className="px-4 text-text-secondary">{contract.staffName ?? '—'}</td>
                  <td className="px-4 tabular-nums text-text-secondary">
                    {formatDate(contract.applicationDate)}
                  </td>
                  <td className="px-4">
                    <Badge tone={LOOOP_STATUS_TONE[contract.status] ?? 'neutral'}>
                      {LOOOP_STATUS_LABELS[contract.status] ?? contract.status}
                    </Badge>
                  </td>
                  <td className="px-4 text-right tabular-nums text-text-primary">
                    {formatCurrency(contract.unitPrice)}
                  </td>
                  <td className="px-4 tabular-nums text-text-secondary">
                    {formatYearMonth(contract.revenueMonth)}
                  </td>
                  <td className="px-4">
                    <Badge tone={PAYMENT_STATUS_TONE[contract.paymentStatus] ?? 'neutral'}>
                      {PAYMENT_STATUS_LABELS[contract.paymentStatus] ?? contract.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSheet(contract)}
                    >
                      編集
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status update sheet */}
      <Sheet
        open={selectedId !== null}
        onClose={closeSheet}
        title={selected ? `${selected.customerName} — ステータス変更` : 'ステータス変更'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSheet}>
              キャンセル
            </Button>
            <Button onClick={handleSave} loading={isPending}>
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="looop-status" required>
              申込ステータス
            </Label>
            <select
              id="looop-status"
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value);
                setError('');
              }}
              className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {(LOOOP_STATUSES as readonly string[]).map((s) => (
                <option key={s} value={s}>
                  {LOOOP_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          {(newStatus === 'cancelled' || newStatus === 'terminated') && (
            <div>
              <Label htmlFor="cancel-reason" required>
                {newStatus === 'cancelled' ? 'キャンセル理由' : '解約理由'}
              </Label>
              <textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="理由を入力してください"
                className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-status-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
