import { PageHeader } from '@/components/layout/page-header';
import { formatYearMonth } from '@/lib/format';
import { LOOOP_PAYMENT_METHOD_LABELS } from '@/lib/status-labels';
import {
  getMonthlyApplicationCounts,
  getMonthlyRevenue,
  getStaffSales,
  getPaymentMethodBreakdown,
  getKwhTierBreakdown,
} from './queries';

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function fmt(n: number): string {
  return n.toLocaleString('ja-JP');
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = params.month || undefined;

  const [monthlyApps, monthlyRev, staff, byMethod, byKwh] = await Promise.all([
    getMonthlyApplicationCounts(6),
    getMonthlyRevenue(6),
    getStaffSales(month),
    getPaymentMethodBreakdown(month),
    getKwhTierBreakdown(month),
  ]);

  return (
    <>
      <PageHeader title="売上集計" />

      <div className="space-y-4 p-4 lg:space-y-6 lg:p-6">
        <Section
          title={month ? `${formatYearMonth(month)}の担当者別実績` : '担当者別実績（全期間）'}
          rightAction={
            <form>
              <label htmlFor="month-filter" className="mr-2 text-xs text-text-tertiary">
                対象月
              </label>
              <input
                id="month-filter"
                type="month"
                name="month"
                defaultValue={month ?? ''}
                className="h-7 rounded border border-border bg-white px-2 text-xs focus-visible:border-brand-primary focus-visible:outline-none"
              />
              <button
                type="submit"
                className="ml-2 h-7 rounded bg-brand-primary px-3 text-xs text-white hover:bg-brand-primaryHover"
              >
                絞り込む
              </button>
            </form>
          }
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">担当者</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">担当顧客数</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">申込件数</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">開通件数</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">明細件数</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">手数料</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">差引手数料</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-10 px-4 text-center text-text-tertiary">
                    データがありません
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.staffId} className="h-10 border-b border-border hover:bg-bg-subtle">
                    <td className="whitespace-nowrap px-3 font-medium text-text-primary">{s.staffName}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(s.customerCount)}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(s.applicationCount)}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(s.openedCount)}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(s.billCount)}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(s.feeTotal)}円</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums font-medium">{fmt(s.netTotal)}円</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="月別 申込・契約・開通・キャンセル件数">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">月</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">申込</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">契約</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">開通</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">キャンセル</th>
              </tr>
            </thead>
            <tbody>
              {monthlyApps.map((m) => (
                <tr key={m.month} className="h-10 border-b border-border">
                  <td className="whitespace-nowrap px-3 tabular-nums text-text-secondary">{formatYearMonth(m.month)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(m.applied)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(m.contracted)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(m.opened)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(m.cancelled)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="月別 売上・返還">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">月</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">明細件数</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">手数料合計</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">差引手数料</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">返還件数</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">返還金額</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRev.map((m) => (
                <tr key={m.month} className="h-10 border-b border-border">
                  <td className="whitespace-nowrap px-3 tabular-nums text-text-secondary">{formatYearMonth(m.month)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(m.billCount)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(m.feeAmount)}円</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums font-medium">{fmt(m.netFee)}円</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums text-text-secondary">{fmt(m.refundCount)}</td>
                  <td className="whitespace-nowrap px-3 text-right tabular-nums text-status-error">{fmt(m.refundAmount)}円</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Section title="支払方法別件数">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                  <th className="h-9 whitespace-nowrap px-3 text-left font-medium">支払方法</th>
                  <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">件数</th>
                </tr>
              </thead>
              <tbody>
                {byMethod.length === 0 ? (
                  <tr><td colSpan={2} className="h-10 px-4 text-center text-text-tertiary">—</td></tr>
                ) : byMethod.map((r) => (
                  <tr key={r.paymentMethod} className="h-10 border-b border-border">
                    <td className="whitespace-nowrap px-3">{LOOOP_PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="kWh区分別件数">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                  <th className="h-9 whitespace-nowrap px-3 text-left font-medium">区分(kWh)</th>
                  <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">件数</th>
                </tr>
              </thead>
              <tbody>
                {byKwh.map((r) => (
                  <tr key={r.label} className="h-10 border-b border-border">
                    <td className="whitespace-nowrap px-3 tabular-nums">{r.label}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums">{fmt(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children, rightAction }: { title: string; children: React.ReactNode; rightAction?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-h2 text-text-primary">{title}</h2>
        {rightAction}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
