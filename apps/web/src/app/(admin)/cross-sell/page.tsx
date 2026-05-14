import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { getCrossSellOpportunities, getCrossSellSummary } from './queries';
import { CrossSellTable } from './cross-sell-table';
import { CrossSellFilters } from './filter-chips';
import { formatCurrency } from '@/lib/format';

interface PageProps {
  searchParams: Promise<{
    productType?: string;
    status?: string;
    interestRank?: string;
    overdue?: string;
  }>;
}

export default async function CrossSellPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [items, summary] = await Promise.all([
    getCrossSellOpportunities({
      productType: params.productType,
      status: params.status,
      interestRank: params.interestRank,
      overdue: params.overdue === '1',
    }),
    getCrossSellSummary(),
  ]);

  return (
    <>
      <PageHeader title="クロスセル" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 p-4 pb-0 lg:grid-cols-4 lg:gap-4 lg:p-6 lg:pb-0">
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">成約件数（累計）</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.totalWon.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">今月の成約件数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.thisMonthWon.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">成約売上合計</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {formatCurrency(summary.totalRevenue)}
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">期限超過</div>
          <div
            className="mt-1 text-h1 tabular-nums"
            style={{ color: summary.overdueCount > 0 ? '#FF7D00' : undefined }}
          >
            {summary.overdueCount > 0 ? (
              <>
                {summary.overdueCount.toLocaleString('ja-JP')}
                <span className="ml-1 text-sm font-normal" style={{ color: '#FF7D00' }}>件</span>
              </>
            ) : (
              <span className="text-text-primary">
                {summary.overdueCount.toLocaleString('ja-JP')}
                <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Filters + Table */}
      <div className="mt-4 mx-4 overflow-hidden rounded-lg border border-border bg-white lg:mt-6 lg:mx-6">
        <Suspense>
          <CrossSellFilters />
        </Suspense>
        <CrossSellTable items={items} />
      </div>
    </>
  );
}
