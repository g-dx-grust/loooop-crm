export const dynamic = 'force-dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import {
  getElectricBillBands,
  getEventPerformance,
  getKpiSummary,
  getMonthlyTrend,
  getStaffPerformance,
} from './queries';
import { BarChart, MonthPicker } from './kpi-charts';
import type { BarChartDataPoint } from './kpi-charts';

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function prevYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${prev.y}-${String(prev.m).padStart(2, '0')}`;
}

/** Build list of the last N months ending at `endYm`, newest first */
function recentMonths(endYm: string, count: number): string[] {
  const result: string[] = [];
  let ym = endYm;
  for (let i = 0; i < count; i++) {
    result.push(ym);
    ym = prevYearMonth(ym);
  }
  return result;
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  return `${year}年${parseInt(month, 10)}月`;
}

// ---------------------------------------------------------------------------
// DeltaBadge — purely presentational, no client state needed
// ---------------------------------------------------------------------------

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const positive = delta >= 0;
  const sign = positive ? '+' : '';
  return (
    <span
      className="text-xs tabular-nums"
      style={{ color: positive ? '#00B42A' : '#F53F3F' }}
      aria-label={`前月比 ${sign}${delta}%`}
    >
      {positive ? '▲' : '▼'} {sign}{delta}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: string;
  unit?: string;
  delta: number | null;
}

function SummaryCard({ label, value, unit, delta }: SummaryCardProps) {
  return (
    <Card className="flex flex-col gap-1 p-3 lg:p-5">
      <div className="text-xs text-text-tertiary">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="tabular-nums text-h1 text-text-primary lg:text-[24px] lg:leading-8">
          {value}
        </span>
        {unit ? <span className="text-sm font-normal text-text-tertiary">{unit}</span> : null}
      </div>
      <DeltaBadge delta={delta} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function KpiPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const todayYm = currentYearMonth();
  const selectedMonth = params.month ?? todayYm;

  // Selectable months: current + previous 5 (6 total), newest first
  const selectableMonths = recentMonths(todayYm, 6);

  const [summary, trend, staffPerf, eventPerf, electricBillBands] = await Promise.all([
    getKpiSummary(selectedMonth),
    getMonthlyTrend(6, todayYm),
    getStaffPerformance(selectedMonth),
    getEventPerformance(selectedMonth),
    getElectricBillBands(selectedMonth),
  ]);

  // --- Bar chart data: 申込数 ---
  const applicationsBars: BarChartDataPoint[] = trend.map((t) => ({
    label: t.label,
    value: t.applications,
    isCurrentMonth: t.yearMonth === selectedMonth,
  }));

  // --- Bar chart data: 売上 ---
  const revenueBars: BarChartDataPoint[] = trend.map((t) => ({
    label: t.label,
    value: t.revenue,
    isCurrentMonth: t.yearMonth === selectedMonth,
  }));

  // --- Bar chart data: 開通数 ---
  const openedBars: BarChartDataPoint[] = trend.map((t) => ({
    label: t.label,
    value: t.opened,
    isCurrentMonth: t.yearMonth === selectedMonth,
  }));

  const electricBillBars: BarChartDataPoint[] = electricBillBands.map((band) => ({
    label: band.label.replace('円', ''),
    value: band.count,
    isCurrentMonth: true,
  }));

  return (
    <>
      <PageHeader
        title="KPI"
        action={<MonthPicker currentMonth={selectedMonth} months={selectableMonths} />}
      />

      <div className="space-y-4 p-4 lg:space-y-6 lg:p-6">
        {/* Selected month label */}
        <p className="text-xs text-text-tertiary">
          集計期間: {formatMonthLabel(selectedMonth)}
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <SummaryCard
            label="申込数"
            value={summary.thisMonth.applications.toLocaleString('ja-JP')}
            unit="件"
            delta={summary.applicationsDelta}
          />
          <SummaryCard
            label="開通数"
            value={summary.thisMonth.opened.toLocaleString('ja-JP')}
            unit="件"
            delta={summary.openedDelta}
          />
          <SummaryCard
            label="売上"
            value={formatCurrency(summary.thisMonth.revenue)}
            delta={summary.revenueDelta}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 申込数 + 開通数 */}
          <Card>
            <CardHeader>
              <CardTitle>月次申込・開通数</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs text-text-tertiary">申込数</p>
                <BarChart
                  data={applicationsBars}
                  height={140}
                  formatValue={(v) => `${v}件`}
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-text-tertiary">開通数</p>
                <BarChart
                  data={openedBars}
                  height={120}
                  formatValue={(v) => `${v}件`}
                />
              </div>
            </div>
          </Card>

          {/* 月次売上 */}
          <Card>
            <CardHeader>
              <CardTitle>月次売上</CardTitle>
            </CardHeader>
            <BarChart
              data={revenueBars}
              height={280}
              formatValue={(v) => formatCurrency(v)}
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>月間電気料金帯</CardTitle>
            </CardHeader>
            <BarChart
              data={electricBillBars}
              height={220}
              formatValue={(v) => `${v}件`}
            />
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-h1 text-text-primary">催事会場別実績</h2>
            </div>
            {eventPerf.length === 0 ? (
              <p className="px-5 py-8 text-sm text-text-tertiary text-center">
                {formatMonthLabel(selectedMonth)}の会場データはありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle">
                      <th className="h-9 px-4 text-left text-xs font-semibold text-text-secondary">
                        会場
                      </th>
                      <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                        登録数
                      </th>
                      <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                        申込
                      </th>
                      <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                        開通
                      </th>
                      <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                        平均電気料金
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventPerf.map((row) => (
                      <tr
                        key={`${row.eventName}-${row.eventDate ?? ''}`}
                        className="h-10 border-b border-border last:border-0 hover:bg-bg-subtle"
                      >
                        <td className="px-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-text-primary">
                              {row.venueName ?? row.eventName}
                            </span>
                            {row.eventDate ? (
                              <span className="text-xs tabular-nums text-text-tertiary">
                                {row.eventDate}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                          {row.leadCount.toLocaleString('ja-JP')}
                        </td>
                        <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                          {row.applications.toLocaleString('ja-JP')}
                        </td>
                        <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                          {row.opened.toLocaleString('ja-JP')}
                        </td>
                        <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                          {row.avgMonthlyBill != null ? formatCurrency(row.avgMonthlyBill) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Staff performance table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-h1 text-text-primary">担当者別実績</h2>
          </div>

          {staffPerf.length === 0 ? (
            <p className="px-5 py-8 text-sm text-text-tertiary text-center">
              {formatMonthLabel(selectedMonth)}のデータはありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle">
                    <th className="h-9 px-4 text-left text-xs font-semibold text-text-secondary">
                      担当者
                    </th>
                    <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                      申込数
                    </th>
                    <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                      開通数
                    </th>
                    <th className="h-9 px-4 text-right text-xs font-semibold text-text-secondary">
                      売上
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerf.map((row, i) => (
                    <tr
                      key={i}
                      className="h-10 border-b border-border last:border-0 hover:bg-bg-subtle"
                    >
                      <td className="px-4 text-sm text-text-primary">{row.staffName}</td>
                      <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                        {row.applications.toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                        {row.opened.toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 text-right tabular-nums text-sm text-text-primary">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
