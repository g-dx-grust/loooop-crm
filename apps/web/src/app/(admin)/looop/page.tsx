export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { getLooopContracts, getLooopSummary, getLooopCustomerOptions, getLooopStaffOptions } from './queries';
import { LooopStatusTabs } from './status-tabs';
import { LooopTable } from './looop-table';
import { LooopActionsBar } from './looop-actions-bar';
import { LooopStaffFilter } from './staff-filter';
import { formatCurrency } from '@/lib/format';
import { getCurrentUser } from '@looop/auth';

interface PageProps {
  searchParams: Promise<{ status?: string; staffId?: string }>;
}

export default async function LooopPage({ searchParams }: PageProps) {
  const [params, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  const isField = currentUser?.roleCodes.includes('field') ?? false;
  const statusFilter = params.status ?? '';
  const staffIdParam = isField ? (currentUser?.id ?? '') : (params.staffId ?? '');

  const [contracts, summary, customerOptions, staffOptions] = await Promise.all([
    getLooopContracts({
      status: statusFilter || undefined,
      staffId: staffIdParam || undefined,
    }),
    getLooopSummary(),
    getLooopCustomerOptions(),
    isField ? Promise.resolve([]) : getLooopStaffOptions(),
  ]);

  return (
    <>
      <PageHeader title="Looop申込" action={<LooopActionsBar customers={customerOptions} />} />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 p-4 pb-0 sm:gap-4 lg:p-6 lg:pb-0">
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">今月の申込数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.thisMonthApplications.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">今月の開通数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.thisMonthOpened.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">今月の売上</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {formatCurrency(summary.thisMonthRevenue)}
          </div>
        </Card>
      </div>

      {/* Tabs + Table */}
      <div className="mt-4 mx-4 overflow-hidden rounded-lg border border-border bg-white lg:mt-6 lg:mx-6">
        <Suspense>
          <LooopStatusTabs />
        </Suspense>
        {!isField && staffOptions.length > 0 && (
          <Suspense>
            <LooopStaffFilter staffOptions={staffOptions} currentStaffId={staffIdParam} />
          </Suspense>
        )}
        <LooopTable contracts={contracts} />
      </div>
    </>
  );
}
