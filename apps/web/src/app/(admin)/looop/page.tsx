import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getLooopContracts, getLooopSummary } from './queries';
import { LooopStatusTabs } from './status-tabs';
import { LooopTable } from './looop-table';
import { formatCurrency } from '@/lib/format';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function LooopPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = params.status ?? '';

  const [contracts, summary] = await Promise.all([
    getLooopContracts({ status: statusFilter || undefined }),
    getLooopSummary(),
  ]);

  return (
    <>
      <PageHeader
        title="Looop申込"
        action={
          <Button variant="secondary" size="md">
            売上集計
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 p-6 pb-0">
        <Card>
          <div className="text-xs text-text-tertiary">今月の申込数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.thisMonthApplications.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-text-tertiary">今月の開通数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.thisMonthOpened.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-text-tertiary">今月の売上</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {formatCurrency(summary.thisMonthRevenue)}
          </div>
        </Card>
      </div>

      {/* Tabs + Table */}
      <div className="mt-6 border border-border bg-white mx-6 rounded-lg overflow-hidden">
        <Suspense>
          <LooopStatusTabs />
        </Suspense>
        <LooopTable contracts={contracts} />
      </div>
    </>
  );
}
