export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@looop/auth';
import { userHasPermission } from '@looop/permissions';
import { PageHeader } from '@/components/layout/page-header';
import {
  getAuditLogs,
  getConsentVersions,
  getEvents,
  getStaffOptions,
  getStaffUsers,
} from './queries';
import { AuditSection } from './audit-section';
import { EventsSection } from './events-section';
import { AnchorTabs } from './anchor-tabs';
import { ConsentSection } from './consent-section';
import { UsersSection } from './users-section';

export default async function AdminPage() {
  const user = await getCurrentUser();
  const canManageUsers = user ? userHasPermission(user, 'admin.manage_users') : false;
  const canManageEvents = user ? userHasPermission(user, 'event.manage') : false;

  const [auditResult, eventsList, staffOptions, consentVersions, usersList] = await Promise.all([
    getAuditLogs({ page: 1 }),
    canManageEvents ? getEvents() : Promise.resolve([]),
    canManageEvents ? getStaffOptions() : Promise.resolve([]),
    getConsentVersions(),
    canManageUsers ? getStaffUsers() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="管理" />
      <div className="space-y-6 p-4 lg:space-y-8 lg:p-6">
        <AnchorTabs canManageUsers={canManageUsers} canManageEvents={canManageEvents} />
        {canManageUsers && <UsersSection initialUsers={usersList} />}
        <AuditSection initialRows={auditResult.rows} initialTotal={auditResult.total} />
        {canManageEvents && (
          <EventsSection initialEvents={eventsList} staffOptions={staffOptions} />
        )}
        <ConsentSection initialVersions={consentVersions} />
      </div>
    </>
  );
}
