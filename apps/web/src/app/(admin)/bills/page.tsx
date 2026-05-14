export const dynamic = 'force-dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { getBills, getBillSummary, getCustomerOptions, getStaffOptions } from './queries';
import { BillsTable } from './bills-table';
import { BillFilters } from './bill-filters';

interface PageProps {
  searchParams: Promise<{ month?: string; staff?: string; method?: string; refund?: string }>;
}

export default async function BillsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    month: params.month || undefined,
    staffId: params.staff || undefined,
    paymentMethod: params.method || undefined,
    refundOnly: params.refund === '1',
  };

  const [bills, summary, customers, staff] = await Promise.all([
    getBills(filters),
    getBillSummary(filters),
    getCustomerOptions(),
    getStaffOptions(),
  ]);

  return (
    <>
      <PageHeader title="明細管理" />

      <div className="grid grid-cols-2 gap-3 p-4 pb-0 lg:grid-cols-4 lg:gap-4 lg:p-6 lg:pb-0">
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">明細件数</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.totalCount.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">手数料合計</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.totalFee.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">円</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">差引手数料合計</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.totalNet.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">円</span>
          </div>
        </Card>
        <Card className="p-3 lg:p-5">
          <div className="text-xs text-text-tertiary">返還対象</div>
          <div className="mt-1 text-h1 tabular-nums text-text-primary">
            {summary.refundCount.toLocaleString('ja-JP')}
            <span className="ml-1 text-sm font-normal text-text-tertiary">件</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 mx-4 overflow-hidden rounded-lg border border-border bg-white lg:mt-6 lg:mx-6">
        <BillFilters staff={staff} />
        <BillsTable bills={bills} customers={customers} />
      </div>
    </>
  );
}
