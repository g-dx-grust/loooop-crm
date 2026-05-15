export const dynamic = 'force-dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { getEventsForAdmin } from './actions';
import { EventsClient } from './events-client';

export default async function EventsPage() {
  const eventsData = await getEventsForAdmin();

  return (
    <>
      <PageHeader title="催事・テレマ管理" />
      <div className="p-4 lg:p-6">
        <EventsClient initialEvents={eventsData} />
      </div>
    </>
  );
}
