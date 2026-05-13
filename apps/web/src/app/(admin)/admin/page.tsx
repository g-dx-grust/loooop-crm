import { PageHeader } from '@/components/layout/page-header';
import { getAuditLogs, getConsentVersions, getEvents, getStaffOptions } from './queries';
import { AuditSection } from './audit-section';
import { EventsSection } from './events-section';
import { AnchorTabs } from './anchor-tabs';
import { ConsentSection } from './consent-section';

export default async function AdminPage() {
  const [auditResult, eventsList, staffOptions, consentVersions] = await Promise.all([
    getAuditLogs({ page: 1 }),
    getEvents(),
    getStaffOptions(),
    getConsentVersions(),
  ]);

  return (
    <>
      <PageHeader title="管理" />
      <div className="p-6 space-y-8">
        <AnchorTabs />
        <AuditSection initialRows={auditResult.rows} initialTotal={auditResult.total} />
        <EventsSection initialEvents={eventsList} staffOptions={staffOptions} />
        <ConsentSection initialVersions={consentVersions} />
      </div>
    </>
  );
}
