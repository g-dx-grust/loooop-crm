export const dynamic = 'force-dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { getFeeMaster } from './queries';
import { FeeMasterClient } from './fee-master-client';

export default async function FeeMasterPage() {
  const rows = await getFeeMaster();

  return (
    <>
      <PageHeader title="手数料マスター" />

      <div className="px-4 pt-3 text-xs text-text-tertiary lg:px-6">
        プラン × 支払方法 × kWh区分ごとの手数料額を管理します。明細登録時に適用日（明細対象月の1日）に有効な区分を参照して自動計算します。
      </div>

      <div className="mt-3 mx-4 overflow-hidden rounded-lg border border-border bg-white lg:mx-6">
        <FeeMasterClient rows={rows} />
      </div>
    </>
  );
}
