'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MapPin, AlertTriangle, X, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { BadgeTone } from '@/components/ui/badge';
import type { CustomerListItem } from './queries';

const LOOOP_STATUS_LABELS: Record<string, string> = {
  applied:        '申込済',
  cancelled:      'キャンセル',
  matching_error: 'マッチングエラー',
  terminated:     '解約',
  completed:      '完了',
};

function looopStatusTone(status: string | null): BadgeTone {
  switch (status) {
    case 'completed':      return 'success';
    case 'applied':        return 'info';
    case 'cancelled':
    case 'matching_error': return 'error';
    case 'terminated':     return 'neutral';
    default:               return 'neutral';
  }
}

interface Props {
  items: CustomerListItem[];
}

export function CustomerTableClient({ items }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }, [allSelected, items]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelected(new Set());

  const exportSelectedCsv = () => {
    const selectedItems = items.filter((item) => selected.has(item.id));
    const header = [
      '顧客ID',
      '氏名',
      'カナ',
      '電話番号',
      'メールアドレス',
      '生年月日',
      '催事日',
      '催事名',
      '会場名',
      '担当者',
      '月間電気料金',
      'ワット数',
      '明細利用月',
      'Looopステータス',
      '同意',
      'ピン確認',
    ];
    const rows = selectedItems.map((item) => [
      item.displayId,
      item.name,
      item.kana ?? '',
      item.phoneEnc,
      item.emailEnc ?? '',
      item.birthDate ?? '',
      item.eventDate ?? '',
      item.eventName ?? '',
      item.venueName ?? '',
      item.staffName ?? '',
      item.monthlyElectricBill != null ? String(item.monthlyElectricBill) : '',
      item.wattage != null ? String(item.wattage) : '',
      item.billUsageMonth ?? '',
      item.looopStatus ? (LOOOP_STATUS_LABELS[item.looopStatus] ?? item.looopStatus) : '',
      item.hasConsent ? 'あり' : item.consentRevoked ? '撤回済み' : 'なし',
      item.pinConfirmed ? '確認済み' : '未確認',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    anchor.href = url;
    anchor.download = `customers_${date}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Floating action bar */}
      {selected.size > 0 && (
        <tr>
          <td colSpan={12} className="p-0">
            <div
              className="fixed bottom-4 left-1/2 z-40 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 sm:bottom-6 sm:w-auto"
              role="region"
              aria-label="選択中の操作"
            >
              <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 shadow-overlay">
                <span className="text-sm text-text-primary tabular-nums">
                  <span className="font-semibold text-brand-primary">{selected.size}</span>件選択中
                </span>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={exportSelectedCsv}
                >
                  <FileDown className="size-4" />
                  CSV出力
                </Button>
                <button
                  onClick={clearSelection}
                  className="flex size-7 items-center justify-center rounded hover:bg-bg-subtle"
                  aria-label="選択を解除"
                >
                  <X className="size-4 text-text-tertiary" />
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Header checkbox row — injected as first tbody row so it lines up with th */}
      <tr className="border-b border-border bg-bg-subtle" aria-hidden>
        <td className="w-10 px-3 py-0">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll}
            className="size-3.5 cursor-pointer accent-brand-primary"
            aria-label="全件選択"
          />
        </td>
        <td colSpan={12} className="py-0" />
      </tr>

      {items.map((item) => {
        const isSelected = selected.has(item.id);
        return (
          <tr
            key={item.id}
            className={cn(
              'h-10 border-b border-border last:border-0 cursor-pointer transition-colors',
              isSelected ? 'bg-brand-primarySoft' : 'hover:bg-bg-subtle',
            )}
            onClick={() => router.push(`/customers/${item.id}`)}
          >
            {/* Checkbox — stop propagation so row click doesn't trigger */}
            <td
              className="w-10 px-3"
              onClick={(e) => { e.stopPropagation(); toggleOne(item.id); }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(item.id)}
                className="size-3.5 cursor-pointer accent-brand-primary"
                aria-label={`${item.name}を選択`}
              />
            </td>

            {/* ID */}
            <td className="px-3">
              <span className="tabular-nums text-xs text-text-tertiary">{item.displayId}</span>
            </td>

            {/* Name + kana */}
            <td className="px-3">
              <span className="font-medium text-text-primary">{item.name}</span>
              {item.kana ? (
                <span className="ml-1.5 text-xs text-text-tertiary">{item.kana}</span>
              ) : null}
            </td>

            {/* Phone */}
            <td className="px-3">
              <span className="tabular-nums text-sm text-text-secondary">
                {maskPhone(item.phoneEnc)}
              </span>
            </td>

            {/* Email / birth date */}
            <td className="px-3">
              {item.emailEnc || item.birthDate ? (
                <div className="flex flex-col">
                  {item.emailEnc ? (
                    <span className="max-w-[180px] truncate text-xs text-text-secondary">
                      {item.emailEnc}
                    </span>
                  ) : null}
                  {item.birthDate ? (
                    <span className="tabular-nums text-xs text-text-tertiary">
                      {item.birthDate}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-text-disabled">—</span>
              )}
            </td>

            {/* Postal code + city */}
            <td className="px-3">
              {item.postalCode || item.city ? (
                <div className="flex flex-col gap-0">
                  {item.postalCode ? (
                    <span className="tabular-nums text-xs text-text-secondary leading-4">〒{item.postalCode}</span>
                  ) : null}
                  {item.city ? (
                    <span className="text-xs text-text-primary leading-4">{item.city}</span>
                  ) : null}
                </div>
              ) : (
                <span className="text-text-disabled">—</span>
              )}
            </td>

            {/* Event date / venue — 2 lines */}
            <td className="px-3">
              {item.eventDate || item.venueName ? (
                <div className="flex flex-col gap-0">
                  {item.eventDate ? (
                    <span className="tabular-nums text-xs text-text-secondary leading-4">{item.eventDate}</span>
                  ) : null}
                  {item.venueName ? (
                    <span className="text-sm text-text-primary leading-5">{item.venueName}</span>
                  ) : null}
                </div>
              ) : (
                <span className="text-text-disabled">—</span>
              )}
            </td>

            {/* Electric info */}
            <td className="px-3">
              {item.monthlyElectricBill != null || item.wattage != null || item.billUsageMonth ? (
                <div className="flex flex-col gap-0 text-xs">
                  {item.monthlyElectricBill != null ? (
                    <span className="tabular-nums text-text-primary">
                      ¥{item.monthlyElectricBill.toLocaleString('ja-JP')}
                    </span>
                  ) : null}
                  {item.wattage != null ? (
                    <span className="tabular-nums text-text-secondary">
                      {item.wattage.toLocaleString('ja-JP')}W
                    </span>
                  ) : null}
                  {item.billUsageMonth ? (
                    <span className="tabular-nums text-text-tertiary">
                      {item.billUsageMonth}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-text-disabled">—</span>
              )}
            </td>

            {/* Staff */}
            <td className="px-3">
              <span className="text-sm text-text-secondary">
                {item.staffName ?? <span className="text-text-disabled">—</span>}
              </span>
            </td>

            {/* Looop status */}
            <td className="px-3">
              <Badge tone={looopStatusTone(item.looopStatus)}>
                {item.looopStatus
                  ? (LOOOP_STATUS_LABELS[item.looopStatus] ?? item.looopStatus)
                  : LOOOP_STATUS_LABELS.not_proposed}
              </Badge>
            </td>

            {/* Consent */}
            <td className="px-3 text-center">
              {item.consentRevoked ? (
                <AlertTriangle
                  className="mx-auto size-4 text-status-warning"
                  aria-label="同意撤回済み"
                />
              ) : item.hasConsent ? (
                <Check
                  className="mx-auto size-4 text-status-success"
                  aria-label="同意あり"
                />
              ) : (
                <span className="text-text-disabled" aria-label="同意なし">—</span>
              )}
            </td>

            {/* Pin */}
            <td className="px-3 text-center">
              {item.pinConfirmed ? (
                <MapPin
                  className="mx-auto size-4 text-brand-primary"
                  aria-label="ピン確認済み"
                  fill="currentColor"
                  strokeWidth={0}
                />
              ) : (
                <MapPin
                  className="mx-auto size-4 text-text-disabled"
                  aria-label="ピン未確認"
                />
              )}
            </td>

            {/* Updated at */}
            <td className="px-3">
              <span className="tabular-nums text-xs text-text-tertiary">
                {item.updatedAt ? format(new Date(item.updatedAt), 'M月d日') : '—'}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) return `***-****-${digits.slice(-4)}`;
  return '***-****-????';
}
