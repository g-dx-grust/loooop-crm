import {
  db,
  customers,
  customerAddresses,
  consents,
  leads,
  events,
  users,
  looopContracts,
  partnerCompanies,
  eq,
  and,
  isNull,
  desc,
} from '@looop/db';

export interface SolarEligibleCustomer {
  id: string;
  displayId: string;
  name: string;
  kana: string | null;
  phoneEnc: string;
  emailEnc: string | null;
  birthDate: string | null;
  postalCode: string | null;
  prefecture: string | null;
  city: string | null;
  street: string | null;
  building: string | null;
  latitude: number | null;
  longitude: number | null;
  staffName: string | null;
  eventName: string | null;
  eventDate: string | null;
  monthlyElectricBill: number | null;
  wattage: number | null;
  billUsageMonth: string | null;
  consentedAt: string;
  consentTextVersion: string;
}

export async function getSolarEligibleCustomers(): Promise<SolarEligibleCustomer[]> {
  const rows = await db
    .select({
      id: customers.id,
      displayId: customers.displayId,
      name: customers.name,
      kana: customers.kana,
      phoneEnc: customers.phoneEnc,
      emailEnc: customers.emailEnc,
      birthDate: customers.birthDate,
      postalCode: customerAddresses.postalCode,
      prefecture: customerAddresses.prefecture,
      city: customerAddresses.city,
      street: customerAddresses.street,
      building: customerAddresses.building,
      latitude: customerAddresses.latitude,
      longitude: customerAddresses.longitude,
      staffName: users.displayName,
      eventName: events.eventName,
      eventDate: events.eventDate,
      monthlyElectricBill: looopContracts.monthlyElectricBill,
      wattage: looopContracts.wattage,
      billUsageMonth: looopContracts.billUsageMonth,
      consentedAt: consents.consentedAt,
      consentTextVersion: consents.consentTextVersion,
    })
    .from(customers)
    .innerJoin(
      customerAddresses,
      and(
        eq(customerAddresses.customerId, customers.id),
        eq(customerAddresses.isPrimary, true),
        eq(customerAddresses.pinConfirmed, true),
        isNull(customerAddresses.deletedAt),
      ),
    )
    .innerJoin(
      consents,
      and(
        eq(consents.customerId, customers.id),
        eq(consents.consentType, 'solar_partner_share'),
        eq(consents.consentStatus, 'granted'),
        isNull(consents.withdrawnAt),
      ),
    )
    .leftJoin(leads, eq(leads.customerId, customers.id))
    .leftJoin(events, eq(events.id, leads.eventId))
    .leftJoin(users, eq(users.id, leads.staffId))
    .leftJoin(
      looopContracts,
      and(
        eq(looopContracts.customerId, customers.id),
        isNull(looopContracts.deletedAt),
      ),
    )
    .where(isNull(customers.deletedAt))
    .orderBy(desc(customers.createdAt));

  // Dedupe: a customer may appear multiple times if they have multiple leads
  const seen = new Set<string>();
  const result: SolarEligibleCustomer[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const consentDate = row.consentedAt instanceof Date
      ? row.consentedAt.toISOString()
      : new Date(Number(row.consentedAt) * 1000).toISOString();
    result.push({
      id: row.id,
      displayId: row.displayId,
      name: row.name,
      kana: row.kana ?? null,
      phoneEnc: row.phoneEnc instanceof Uint8Array ? Buffer.from(row.phoneEnc).toString('utf8') : row.phoneEnc as string,
      emailEnc: row.emailEnc instanceof Uint8Array ? Buffer.from(row.emailEnc).toString('utf8') : (row.emailEnc ?? null),
      birthDate: row.birthDate ?? null,
      postalCode: row.postalCode ?? null,
      prefecture: row.prefecture ?? null,
      city: row.city ?? null,
      street: row.street ?? null,
      building: row.building ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      staffName: row.staffName ?? null,
      eventName: row.eventName ?? null,
      eventDate: row.eventDate ?? null,
      monthlyElectricBill: row.monthlyElectricBill ?? null,
      wattage: row.wattage ?? null,
      billUsageMonth: row.billUsageMonth ?? null,
      consentedAt: consentDate,
      consentTextVersion: row.consentTextVersion,
    });
  }
  return result;
}

export async function getActivePartners() {
  return db
    .select()
    .from(partnerCompanies)
    .where(eq(partnerCompanies.active, true))
    .orderBy(partnerCompanies.name);
}
