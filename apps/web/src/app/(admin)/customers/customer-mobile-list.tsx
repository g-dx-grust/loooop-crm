'use client';

import Link from 'next/link';
import { Check, MapPin, AlertTriangle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    case 'opened':       return 'success';
    case 'applied':
    case 'under_review': return 'info';
    case 'cancelled':    return 'error';
    case 'proposed':
    case 'interested':   return 'warning';
    default:             return 'neutral';
  }
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) return `***-****-${digits.slice(-4)}`;
  return '***-****-????';
}

interface Props {
  items: CustomerListItem[];
  hasActiveFilters: boolean;
}

export function CustomerMobileList({ items, hasActiveFilters }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white py-12">
        <div className="flex flex-col items-center gap-3">
          <Search className="size-8 text-text-disabled" aria-hidden />
          <p className="text-sm text-text-secondary">条件に一致する顧客が見つかりません</p>
          {hasActiveFilters ? (
            <Link href="/customers">
              <Button variant="secondary" size="sm">フィルタをリセット</Button>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/customers/${item.id}`}
            className="block rounded-lg border border-border bg-white p-3 transition-colors active:bg-bg-subtle"
          >
            {/* Top row: name + status badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {item.name}
                  </span>
                  {item.kana ? (
                    <span className="truncate text-xs text-text-tertiary">{item.kana}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 tabular-nums text-xs text-text-tertiary">
                  {item.displayId}
                </p>
              </div>
              <Badge tone={looopStatusTone(item.looopStatus)}>
                {item.looopStatus
                  ? (LOOOP_STATUS_LABELS[item.looopStatus] ?? item.looopStatus)
                  : LOOOP_STATUS_LABELS.not_proposed}
              </Badge>
            </div>

            {/* Meta rows */}
            <dl className="mt-2.5 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-text-tertiary">電話</dt>
              <dd className="tabular-nums text-text-secondary">{maskPhone(item.phoneEnc)}</dd>

              {item.venueName || item.eventDate ? (
                <>
                  <dt className="text-text-tertiary">会場</dt>
                  <dd className="text-text-secondary">
                    {item.venueName ?? '—'}
                    {item.eventDate ? (
                      <span className="ml-1.5 tabular-nums text-text-tertiary">
                        ({item.eventDate})
                      </span>
                    ) : null}
                  </dd>
                </>
              ) : null}

              {item.staffName ? (
                <>
                  <dt className="text-text-tertiary">担当</dt>
                  <dd className="truncate text-text-secondary">{item.staffName}</dd>
                </>
              ) : null}

              {item.monthlyElectricBill != null ? (
                <>
                  <dt className="text-text-tertiary">電気代</dt>
                  <dd className="tabular-nums text-text-secondary">
                    ¥{item.monthlyElectricBill.toLocaleString('ja-JP')}
                    {item.wattage != null ? (
                      <span className="ml-1.5 text-text-tertiary">
                        / {item.wattage.toLocaleString('ja-JP')}W
                      </span>
                    ) : null}
                  </dd>
                </>
              ) : null}
            </dl>

            {/* Footer row: consent / pin / updated */}
            <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-xs">
              <div className="flex items-center gap-3 text-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  {item.consentRevoked ? (
                    <>
                      <AlertTriangle className="size-3.5 text-status-warning" aria-hidden />
                      撤回
                    </>
                  ) : item.hasConsent ? (
                    <>
                      <Check className="size-3.5 text-status-success" aria-hidden />
                      同意
                    </>
                  ) : (
                    <>
                      <span className="text-text-disabled">—</span>
                      同意なし
                    </>
                  )}
                </span>
                <span className="inline-flex items-center gap-1">
                  {item.pinConfirmed ? (
                    <>
                      <MapPin className="size-3.5 text-brand-primary" fill="currentColor" strokeWidth={0} aria-hidden />
                      ピン
                    </>
                  ) : (
                    <>
                      <MapPin className="size-3.5 text-text-disabled" aria-hidden />
                      未確認
                    </>
                  )}
                </span>
              </div>
              <span className="tabular-nums text-text-tertiary">
                {item.updatedAt ? format(new Date(item.updatedAt), 'M月d日') : '—'}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
