'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatYearMonth } from '@/lib/format';
import { LOOOP_PAYMENT_METHOD_LABELS } from '@/lib/status-labels';
import { BillFormSheet } from './bill-form-sheet';
import type { BillListItem, CustomerOption } from './queries';

interface Props {
  bills: BillListItem[];
  customers: CustomerOption[];
}

function fmtYen(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toLocaleString('ja-JP')}円`;
}

export function BillsTable({ bills, customers }: Props) {
  const [editTarget, setEditTarget] = useState<BillListItem | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-2 border-b border-border bg-white px-4 py-2">
        <Button size="md" onClick={() => setCreating(true)}>
          明細を登録
        </Button>
      </div>

      {/* Mobile card list (< lg) */}
      <ul className="space-y-2 p-3 lg:hidden">
        {bills.length === 0 ? (
          <li className="rounded border border-border bg-white py-8 text-center text-sm text-text-tertiary">
            データがありません
          </li>
        ) : (
          bills.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setEditTarget(b)}
                className="block w-full rounded-lg border border-border bg-white p-3 text-left transition-colors active:bg-bg-subtle"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {b.customerName}
                    </p>
                    <p className="mt-0.5 tabular-nums text-xs text-text-tertiary">
                      {formatYearMonth(b.billMonth)} ・ {LOOOP_PAYMENT_METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {b.refundFlagged ? <Badge tone="error">返還対象</Badge> : null}
                    {b.minimumApplied ? <Badge tone="warning">最低基準</Badge> : null}
                  </div>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">使用量</dt>
                    <dd className="tabular-nums text-text-secondary">
                      {b.usageKwh != null ? `${b.usageKwh.toLocaleString('ja-JP')}kWh` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">電気料金</dt>
                    <dd className="tabular-nums text-text-secondary">{fmtYen(b.electricFee)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">手数料</dt>
                    <dd className="tabular-nums text-text-primary">{fmtYen(b.feeAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">業務管理費</dt>
                    <dd className="tabular-nums text-text-secondary">▲{b.adminFee.toLocaleString('ja-JP')}</dd>
                  </div>
                </dl>
                <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-xs text-text-secondary">担当: {b.staffName ?? '—'}</span>
                  <span className="text-sm font-semibold tabular-nums text-text-primary">
                    差引 {fmtYen(b.netFee)}
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
              <th className="h-9 px-3 text-left font-medium">対象月</th>
              <th className="h-9 px-3 text-left font-medium">顧客名</th>
              <th className="h-9 px-3 text-left font-medium">担当者</th>
              <th className="h-9 px-3 text-left font-medium">支払方法</th>
              <th className="h-9 px-3 text-right font-medium tabular-nums">使用量(kWh)</th>
              <th className="h-9 px-3 text-right font-medium tabular-nums">電気料金</th>
              <th className="h-9 px-3 text-right font-medium tabular-nums">手数料額</th>
              <th className="h-9 px-3 text-right font-medium tabular-nums">業務管理費</th>
              <th className="h-9 px-3 text-right font-medium tabular-nums">差引手数料</th>
              <th className="h-9 px-3 text-left font-medium">フラグ</th>
              <th className="h-9 px-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan={11} className="h-10 px-4 text-center text-text-tertiary">
                  データがありません
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} className="h-10 border-b border-border hover:bg-bg-subtle">
                  <td className="px-3 tabular-nums text-text-secondary">{formatYearMonth(b.billMonth)}</td>
                  <td className="px-3 font-medium text-text-primary">{b.customerName}</td>
                  <td className="px-3 text-text-secondary">{b.staffName ?? '—'}</td>
                  <td className="px-3 text-text-secondary">
                    {LOOOP_PAYMENT_METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod}
                  </td>
                  <td className="px-3 text-right tabular-nums text-text-secondary">
                    {b.usageKwh != null ? b.usageKwh.toLocaleString('ja-JP') : '—'}
                  </td>
                  <td className="px-3 text-right tabular-nums text-text-secondary">{fmtYen(b.electricFee)}</td>
                  <td className="px-3 text-right tabular-nums text-text-primary">{fmtYen(b.feeAmount)}</td>
                  <td className="px-3 text-right tabular-nums text-text-secondary">▲{b.adminFee.toLocaleString('ja-JP')}</td>
                  <td className="px-3 text-right tabular-nums font-medium text-text-primary">{fmtYen(b.netFee)}</td>
                  <td className="px-3">
                    <div className="flex flex-wrap gap-1">
                      {b.minimumApplied ? <Badge tone="warning">最低基準</Badge> : null}
                      {b.refundFlagged ? <Badge tone="error">返還対象</Badge> : null}
                    </div>
                  </td>
                  <td className="px-3">
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(b)}>
                      編集
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BillFormSheet
        open={creating}
        onClose={() => setCreating(false)}
        customers={customers}
      />
      <BillFormSheet
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        initial={editTarget}
        customers={customers}
      />
    </>
  );
}
