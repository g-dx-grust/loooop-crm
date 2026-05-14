export const dynamic = 'force-dynamic';
import { getActiveEvents, getLatestConsentText } from './actions';
import { IntakeWizard } from './intake-wizard';

export default async function IntakePage() {
  const [events, consentText] = await Promise.all([
    getActiveEvents(),
    getLatestConsentText(),
  ]);
  return <IntakeWizard events={events} consentText={consentText} />;
}
