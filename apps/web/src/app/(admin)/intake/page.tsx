export const dynamic = 'force-dynamic';
import { getActiveEvents, getLatestConsentText } from './actions';
import { IntakeWizard } from './intake-wizard';

export default async function IntakePage() {
  const [events, consentText] = await Promise.all([
    getActiveEvents(),
    getLatestConsentText(),
  ]);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <IntakeWizard events={events} consentText={consentText} />
    </div>
  );
}
