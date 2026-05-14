export const dynamic = 'force-dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatYearMonth, formatDate } from '@/lib/format';
import { REFUND_REASON_LABELS } from '@/lib/status-labels';
import { getRefunds } from './queries';
import { getCustomerOptions } from '../bills/queries';
import { RefundsToolbar } from './refunds-toolbar';

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function RefundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = params.month || undefined;

  const [refunds, customers] = await Promise.all([
    getRefunds({ month }),
    getCustomerOptions(),
  ]);

  const totalAmount = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

  return (
    <>
      <PageHeader title="返還対象一覧" action={<RefundsToolbar customers={customers} />} />

      <div className="grid grid-cols-2 gap-3 p-4 pb-0 lg:gap-4 lg:p-6 lg:pb-0">
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">返還件数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {refunds.length.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">返還金額合計</div>
          <div className="mt-1 text-h1 tabular-nums text-status-error">
            {totalAmount.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">円</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 mx-4 overflow-hidden rounded-lg border border-border bg-white lg:mt-6 lg:mx-6">
        <div className="flex items-center gap-3 border-b border-border bg-bg-base px-4 py-2">
          <form className="flex items-center gap-2">
            <label htmlFor="refund-month-filter" className="text-xs text-text-tertiary">
              返還月
            </label>
            <input
              id="refund-month-filter"
              type="month"
              name="month"
              defaultValue={month ?? ''}
              className="h-7 rounded border border-border bg-white px-2 text-xs focus-visible:border-brand-primary focus-visible:outline-none"
            />
            <button
              type="submit"
              className="h-7 rounded bg-brand-primary px-3 text-xs text-white hover:bg-brand-primaryHover"
            >
              絞り込む
            </button>
          </form>
        </div>
        {/* Mobile card list (< lg) */}
        <ul className="space-y-2 p-3 lg:hidden">
          {refunds.length === 0 ? (
            <li className="rounded border border-border bg-white py-8 text-center text-sm text-text-tertiary">
              データがありません
            </li>
          ) : refunds.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{r.customerName}</p>
                  <p className="mt-0.5 tabular-nums text-xs text-text-tertiary">
                    返還月 {formatYearMonth(r.refundMonth)}
                  </p>
                </div>
                <Badge tone="error">{REFUND_REASON_LABELS[r.reasonCode] ?? r.reasonCode}</Badge>
              </div>
              <dl className="mt-2.5 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-text-tertiary">担当</dt>
                <dd className="truncate text-text-secondary">{r.staffName ?? '—'}</dd>
                <dt className="text-text-tertiary">供給開始</dt>
                <dd className="tabular-nums text-text-secondary">{formatDate(r.supplyStartDate)}</dd>
                <dt className="text-text-tertiary">解約/キャンセル</dt>
                <dd className="tabular-nums text-text-secondary">{formatDate(r.terminationDate ?? r.cancelDate)}</dd>
                {r.note ? (
                  <>
                    <dt className="text-text-tertiary">備考</dt>
                    <dd className="text-text-secondary">{r.note}</dd>
                  </>
                ) : null}
              </dl>
              <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs text-text-tertiary">返還金額</span>
                <span className="text-sm font-semibold tabular-nums text-status-error">
                  {r.refundAmount.toLocaleString('ja-JP')}円
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop table (≥ lg) */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                <th className="h-9 px-3 text-left font-medium">返還月</th>
                <th className="h-9 px-3 text-left font-medium">顧客</th>
                <th className="h-9 px-3 text-left font-medium">担当者</th>
                <th className="h-9 px-3 text-left font-medium">理由</th>
                <th className="h-9 px-3 text-left font-medium">供給開始日</th>
                <th className="h-9 px-3 text-left font-medium">解約/キャンセル日</th>
                <th className="h-9 px-3 text-right font-medium tabular-nums">返還金額</th>
                <th className="h-9 px-3 text-left font-medium">備考</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr><td colSpan={8} className="h-10 px-4 text-center text-text-tertiary">データがありません</td></tr>
              ) : refunds.map((r) => (
                <tr key={r.id} className="h-10 border-b border-border hover:bg-bg-subtle">
                  <td className="px-3 tabular-nums text-text-secondary">{formatYearMonth(r.refundMonth)}</td>
                  <td className="px-3 font-medium text-text-primary">{r.customerName}</td>
                  <td className="px-3 text-text-secondary">{r.staffName ?? '—'}</td>
                  <td className="px-3"><Badge tone="error">{REFUND_REASON_LABELS[r.reasonCode] ?? r.reasonCode}</Badge></td>
                  <td className="px-3 tabular-nums text-text-secondary">{formatDate(r.supplyStartDate)}</td>
                  <td className="px-3 tabular-nums text-text-secondary">{formatDate(r.terminationDate ?? r.cancelDate)}</td>
                  <td className="px-3 text-right tabular-nums font-medium text-status-error">{r.refundAmount.toLocaleString('ja-JP')}円</td>
                  <td className="px-3 text-text-tertiary">{r.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
