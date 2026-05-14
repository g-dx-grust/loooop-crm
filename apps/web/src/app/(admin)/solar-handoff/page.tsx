export const dynamic = 'force-dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { getSolarEligibleCustomers, getActivePartners } from './queries';
import { SolarExportClient } from './solar-export-client';

export default async function SolarHandoffPage() {
  const [eligibleCustomers, partners] = await Promise.all([
    getSolarEligibleCustomers(),
    getActivePartners(),
  ]);

  return (
    <>
      <PageHeader title="太陽光連携" />
      <SolarExportClient customers={eligibleCustomers} partners={partners} />
    </>
  );
}
