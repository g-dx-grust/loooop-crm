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
  not_proposed: '未提案',
  proposed:     '提案済み',
  interested:   '興味あり',
  applied:      '申込済み',
  under_review: '審査中',
  contracted:   '契約完了',
  opened:       '開通済み',
  cancelled:    'キャンセル',
  excluded:     '対象外',
};

function looopStatusTone(status: string | null): BadgeTone {
  switch (status) {
    case 'contracted':
    case 'opened':     return 'success';
    case 'applied':
    case 'under_review': return 'info';
    case 'cancelled':  return 'error';
    case 'proposed':
    case 'interested': return 'warning';
    default:           return 'neutral';
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

  return (
    <>
      {/* Floating action bar */}
      {selected.size > 0 && (
        <tr>
          <td colSpan={10} className="p-0">
            <div
              className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
              role="region"
              aria-label="選択中の操作"
            >
              <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 shadow-overlay">
                <span className="text-sm text-text-primary tabular-nums">
                  <span className="font-semibold text-brand-primary">{selected.size}</span>件選択中
                </span>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // CSV export for selected would go here
                    alert(`${selected.size}件を選択しました（CSV出力機能は太陽光連携画面から）`);
                  }}
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
        <td colSpan={9} className="py-0" />
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
