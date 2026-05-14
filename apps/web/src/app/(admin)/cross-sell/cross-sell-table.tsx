'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  CROSS_SELL_STATUS_LABELS,
  CROSS_SELL_STATUS_TONE,
  PRODUCT_TYPE_LABELS,
} from '@/lib/status-labels';
import { formatDate } from '@/lib/format';
import { updateCrossSell } from './actions';
import type { CrossSellListItem } from './queries';
import { CROSS_SELL_STATUSES, INTEREST_RANKS } from '@/lib/constants';
import type { BadgeTone } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';

interface Props {
  items: CrossSellListItem[];
}

const interestRankTone: Record<string, BadgeTone> = {
  A: 'success',
  B: 'warning',
  C: 'neutral',
};

export function CrossSellTable({ items }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    status: string;
    interestRank: string;
    memo: string;
    nextActionDate: string;
  }>({ status: '', interestRank: '', memo: '', nextActionDate: '' });
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const selected = items.find((i) => i.id === selectedId);

  function openSheet(item: CrossSellListItem) {
    setSelectedId(item.id);
    setForm({
      status: item.status,
      interestRank: item.interestRank ?? '',
      memo: item.memo ?? '',
      nextActionDate: item.nextActionDate ?? '',
    });
    setError('');
  }

  function closeSheet() {
    setSelectedId(null);
    setError('');
  }

  function handleSave() {
    if (!selectedId) return;
    setError('');
    startTransition(async () => {
      const result = await updateCrossSell(selectedId, {
        status: form.status,
        interestRank: form.interestRank || undefined,
        memo: form.memo || undefined,
        nextActionDate: form.nextActionDate || undefined,
      });
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
        {items.length === 0 ? (
          <li className="rounded border border-border bg-white py-8 text-center text-sm text-text-tertiary">
            データがありません
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openSheet(item)}
                className="block w-full rounded-lg border border-border bg-white p-3 text-left transition-colors active:bg-bg-subtle"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-text-primary">
                        {item.customerName}
                      </span>
                      {item.interestRank ? (
                        <Badge tone={interestRankTone[item.interestRank] ?? 'neutral'} withDot={false}>
                          {item.interestRank}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                    </p>
                  </div>
                  <Badge tone={CROSS_SELL_STATUS_TONE[item.status] ?? 'neutral'}>
                    {CROSS_SELL_STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </div>
                <dl className="mt-2.5 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-text-tertiary">担当</dt>
                  <dd className="truncate text-text-secondary">{item.staffName ?? '—'}</dd>
                  <dt className="text-text-tertiary">次回</dt>
                  <dd className="flex items-center gap-1.5 tabular-nums text-text-secondary">
                    {formatDate(item.nextActionDate)}
                    {item.isOverdue && (
                      <span className="inline-flex items-center rounded bg-status-warningSoft px-1.5 py-0.5 text-[11px] font-medium text-status-warning">
                        期限超過
                      </span>
                    )}
                  </dd>
                </dl>
                <div className="mt-2.5 flex items-center justify-end border-t border-border pt-2">
                  <span className="inline-flex items-center gap-1 text-xs text-brand-primary">
                    <Pencil className="size-3" aria-hidden />
                    編集
                  </span>
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
              <th className="h-9 px-4 text-left font-medium">商材</th>
              <th className="h-9 px-4 text-left font-medium">見込み度</th>
              <th className="h-9 px-4 text-left font-medium">ステータス</th>
              <th className="h-9 px-4 text-left font-medium">次回アクション</th>
              <th className="h-9 px-4 text-left font-medium">担当者</th>
              <th className="h-9 px-4 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-10 px-4 text-center text-text-tertiary">
                  データがありません
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="h-10 border-b border-border hover:bg-bg-subtle"
                >
                  <td className="px-4 font-medium text-text-primary">{item.customerName}</td>
                  <td className="px-4 text-text-secondary">
                    {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                  </td>
                  <td className="px-4">
                    {item.interestRank ? (
                      <Badge tone={interestRankTone[item.interestRank] ?? 'neutral'} withDot={false}>
                        {item.interestRank}
                      </Badge>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4">
                    <Badge tone={CROSS_SELL_STATUS_TONE[item.status] ?? 'neutral'}>
                      {CROSS_SELL_STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </td>
                  <td className="px-4 tabular-nums text-text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      {formatDate(item.nextActionDate)}
                      {item.isOverdue && (
                        <span
                          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: '#FFF3E0', color: '#FF7D00' }}
                          aria-label="期限超過"
                        >
                          期限超過
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 text-text-secondary">{item.staffName ?? '—'}</td>
                  <td className="px-4">
                    <Button variant="ghost" size="sm" onClick={() => openSheet(item)}>
                      編集
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Update sheet */}
      <Sheet
        open={selectedId !== null}
        onClose={closeSheet}
        title={selected ? `${selected.customerName} — クロスセル更新` : 'クロスセル更新'}
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
            <Label htmlFor="cs-status" required>
              ステータス
            </Label>
            <select
              id="cs-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {(CROSS_SELL_STATUSES as readonly string[]).map((s) => (
                <option key={s} value={s}>
                  {CROSS_SELL_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="cs-interest-rank">見込み度</Label>
            <select
              id="cs-interest-rank"
              value={form.interestRank}
              onChange={(e) => setForm((f) => ({ ...f, interestRank: e.target.value }))}
              className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="">—</option>
              {(INTEREST_RANKS as readonly string[]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="cs-next-action">次回アクション日</Label>
            <Input
              id="cs-next-action"
              type="date"
              value={form.nextActionDate}
              onChange={(e) => setForm((f) => ({ ...f, nextActionDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="cs-memo">メモ</Label>
            <textarea
              id="cs-memo"
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              rows={3}
              placeholder="メモを入力"
              className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
            />
          </div>

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
