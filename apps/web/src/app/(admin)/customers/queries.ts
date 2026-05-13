import {
  db,
  customers,
  customerAddresses,
  leads,
  events,
  users,
  looopContracts,
  consents,
  activities,
  crossSellOpportunities,
  partnerHandoffs,
  partnerCompanies,
  files,
  auditLogs,
  eq,
  and,
  isNull,
  inArray,
  desc,
  asc,
  or,
  sql,
  type CustomerRow,
  type CustomerAddressRow,
  type LeadRow,
  type LooopContractRow,
  type ConsentRow,
  type ActivityRow,
  type CrossSellRow,
  type PartnerHandoffRow,
  type PartnerCompanyRow,
  type EventRow,
  type UserRow,
  type FileRow,
  type AuditLogRow,
} from '@looop/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomerSortField = 'displayId' | 'name' | 'eventDate' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface CustomerFilters {
  search?: string;
  eventId?: string;
  staffId?: string;
  looopStatus?: string;
  pinConfirmed?: boolean;
  hasConsent?: boolean; // solar_partner_share granted
  page?: number;
  includeCancelled?: boolean;
  sort?: CustomerSortField;
  order?: SortOrder;
}

export interface CustomerListItem {
  id: string;
  displayId: string;
  name: string;
  kana: string | null;
  phoneEnc: string; // masked by caller
  emailEnc: string | null;
  birthDate: string | null;
  city: string | null;
  eventDate: string | null;
  eventName: string | null;
  venueName: string | null;
  staffName: string | null;
  monthlyElectricBill: number | null;
  wattage: number | null;
  billUsageMonth: string | null;
  looopStatus: string | null;
  hasConsent: boolean;
  consentRevoked: boolean;
  pinConfirmed: boolean;
  updatedAt: Date | null;
}

export interface CustomerDetail {
  customer: CustomerRow;
  address: CustomerAddressRow | null;
  allAddresses: CustomerAddressRow[];
  lead: LeadRow | null;
  event: EventRow | null;
  staff: UserRow | null;
  looopContracts: LooopContractRow[];
  crossSell: CrossSellRow[];
  handoffs: (PartnerHandoffRow & { partnerCompany: PartnerCompanyRow | null })[];
  consents: ConsentRow[];
  activities: ActivityRow[];
  nextActionDate: string | null;
  customerFiles: FileRow[];
  auditLogEntries: AuditLogRow[];
}

// ---------------------------------------------------------------------------
// Masking helper (exported for reuse in UI)
// ---------------------------------------------------------------------------

/** Masks a phone number to show only the last 4 digits: ***-****-1234 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***-****-${digits.slice(-4)}`;
  }
  return '***-****-????';
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

export async function getCustomers(filters: CustomerFilters): Promise<{
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Build conditions
  const conditions = [isNull(customers.deletedAt)];

  if (!filters.includeCancelled) {
    // We still include cancelled by default; callers opt out
  }

  // Full-text search on name/kana (SQLite LIKE)
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    const searchCondition = or(
      sql`${customers.name} LIKE ${q}`,
      sql`${customers.kana} LIKE ${q}`,
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  // Fetch main data with joins
  const rows = await db
    .select({
      id: customers.id,
      displayId: customers.displayId,
      name: customers.name,
      kana: customers.kana,
      phoneEnc: customers.phoneEnc,
      emailEnc: customers.emailEnc,
      birthDate: customers.birthDate,
      updatedAt: customers.updatedAt,
      city: customerAddresses.city,
      pinConfirmed: customerAddresses.pinConfirmed,
      eventName: events.eventName,
      eventDate: events.eventDate,
      venueName: events.venueName,
      staffName: users.displayName,
      looopStatus: looopContracts.status,
      monthlyElectricBill: looopContracts.monthlyElectricBill,
      wattage: looopContracts.wattage,
      billUsageMonth: looopContracts.billUsageMonth,
      consentStatus: consents.consentStatus,
      consentType: consents.consentType,
      consentWithdrawnAt: consents.withdrawnAt,
      leadEventId: leads.eventId,
      leadStaffId: leads.staffId,
    })
    .from(customers)
    .leftJoin(
      customerAddresses,
      and(
        eq(customerAddresses.customerId, customers.id),
        eq(customerAddresses.isPrimary, true),
        isNull(customerAddresses.deletedAt),
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
    .leftJoin(
      consents,
      and(
        eq(consents.customerId, customers.id),
        eq(consents.consentType, 'solar_partner_share'),
      ),
    )
    .where(and(...conditions))
    .orderBy(
      (() => {
        const dir = filters.order === 'asc' ? asc : desc;
        switch (filters.sort) {
          case 'displayId':   return dir(customers.displayId);
          case 'name':        return dir(customers.name);
          case 'eventDate':   return dir(events.eventDate);
          default:            return desc(customers.updatedAt);
        }
      })(),
    )
    .limit(PAGE_SIZE)
    .offset(offset);

  // De-duplicate: one row per customer (leftJoins can produce multiple rows)
  // Keep first occurrence which has the latest data due to ORDER BY
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Apply post-fetch filters that are hard to express in SQL with the join structure
  let filtered = deduped;

  if (filters.eventId) {
    filtered = filtered.filter((r) => r.leadEventId === filters.eventId);
  }
  if (filters.staffId) {
    filtered = filtered.filter((r) => r.leadStaffId === filters.staffId);
  }
  if (filters.looopStatus) {
    filtered = filtered.filter((r) => r.looopStatus === filters.looopStatus);
  }
  if (filters.pinConfirmed === true) {
    filtered = filtered.filter((r) => r.pinConfirmed === true);
  }
  if (filters.hasConsent === true) {
    filtered = filtered.filter(
      (r) => r.consentType === 'solar_partner_share' && r.consentStatus === 'granted' && !r.consentWithdrawnAt,
    );
  }

  const items: CustomerListItem[] = filtered.map((r) => ({
    id: r.id,
    displayId: r.displayId,
    name: r.name,
    kana: r.kana,
    phoneEnc: r.phoneEnc,
    emailEnc: r.emailEnc ?? null,
    birthDate: r.birthDate ?? null,
    city: r.city ?? null,
    eventDate: r.eventDate ?? null,
    eventName: r.eventName ?? null,
    venueName: r.venueName ?? null,
    staffName: r.staffName ?? null,
    monthlyElectricBill: r.monthlyElectricBill ?? null,
    wattage: r.wattage ?? null,
    billUsageMonth: r.billUsageMonth ?? null,
    looopStatus: r.looopStatus ?? null,
    hasConsent:
      r.consentType === 'solar_partner_share' &&
      r.consentStatus === 'granted' &&
      !r.consentWithdrawnAt,
    consentRevoked:
      r.consentType === 'solar_partner_share' &&
      !!r.consentWithdrawnAt,
    pinConfirmed: r.pinConfirmed ?? false,
    updatedAt: r.updatedAt ?? null,
  }));

  // Count total (simplified — count from customers table)
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(and(...conditions));
  const total = countResult[0]?.count ?? 0;

  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  // Fetch customer
  const customerRows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)))
    .limit(1);
  const customer = customerRows[0];
  if (!customer) return null;

  // All addresses
  const allAddresses = await db
    .select()
    .from(customerAddresses)
    .where(and(eq(customerAddresses.customerId, id), isNull(customerAddresses.deletedAt)))
    .orderBy(desc(customerAddresses.isPrimary), asc(customerAddresses.createdAt));

  const address = allAddresses.find((a) => a.isPrimary) ?? allAddresses[0] ?? null;

  // Lead (first/only)
  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.customerId, id))
    .orderBy(desc(leads.createdAt))
    .limit(1);
  const lead = leadRows[0] ?? null;

  // Event and staff from lead
  let event: EventRow | null = null;
  let staff: UserRow | null = null;

  if (lead?.eventId) {
    const evRows = await db.select().from(events).where(eq(events.id, lead.eventId)).limit(1);
    event = evRows[0] ?? null;
  }
  if (lead?.staffId) {
    const staffRows = await db.select().from(users).where(eq(users.id, lead.staffId)).limit(1);
    staff = staffRows[0] ?? null;
  }

  // Looop contracts
  const contracts = await db
    .select()
    .from(looopContracts)
    .where(and(eq(looopContracts.customerId, id), isNull(looopContracts.deletedAt)))
    .orderBy(desc(looopContracts.createdAt));

  // Cross-sell
  const crossSell = await db
    .select()
    .from(crossSellOpportunities)
    .where(and(eq(crossSellOpportunities.customerId, id), isNull(crossSellOpportunities.deletedAt)))
    .orderBy(asc(crossSellOpportunities.productType));

  // Partner handoffs
  const handoffRows = await db
    .select()
    .from(partnerHandoffs)
    .where(and(eq(partnerHandoffs.customerId, id), isNull(partnerHandoffs.deletedAt)))
    .orderBy(desc(partnerHandoffs.sharedAt));

  const handoffs: (PartnerHandoffRow & { partnerCompany: PartnerCompanyRow | null })[] = [];
  for (const h of handoffRows) {
    let partnerCompany: PartnerCompanyRow | null = null;
    if (h.partnerCompanyId) {
      const pcRows = await db
        .select()
        .from(partnerCompanies)
        .where(eq(partnerCompanies.id, h.partnerCompanyId))
        .limit(1);
      partnerCompany = pcRows[0] ?? null;
    }
    handoffs.push({ ...h, partnerCompany });
  }

  // Consents
  const consentRows = await db
    .select()
    .from(consents)
    .where(eq(consents.customerId, id))
    .orderBy(desc(consents.consentedAt));

  // Activities
  const activityRows = await db
    .select()
    .from(activities)
    .where(eq(activities.customerId, id))
    .orderBy(desc(activities.createdAt));

  // Next action date from latest activity
  const nextActionDate =
    activityRows.find((a) => a.nextActionDate)?.nextActionDate ?? null;

  // Files
  const customerFiles = await db
    .select()
    .from(files)
    .where(and(eq(files.customerId, id), isNull(files.deletedAt)))
    .orderBy(desc(files.uploadedAt));

  // Audit logs for this customer and associated resources
  const allResourceIds = [
    id,
    ...contracts.map((c) => c.id),
    ...crossSell.map((cs) => cs.id),
    ...consentRows.map((c) => c.id),
  ];
  const auditLogEntries = allResourceIds.length > 0
    ? await db
        .select()
        .from(auditLogs)
        .where(inArray(auditLogs.resourceId, allResourceIds))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100)
    : [];

  return {
    customer,
    address,
    allAddresses,
    lead,
    event,
    staff,
    looopContracts: contracts,
    crossSell,
    handoffs,
    consents: consentRows,
    activities: activityRows,
    nextActionDate,
    customerFiles,
    auditLogEntries,
  };
}

// Lookup helpers for filter dropdowns
export async function getEvents() {
  return db
    .select({ id: events.id, eventName: events.eventName, venueName: events.venueName, eventDate: events.eventDate })
    .from(events)
    .where(isNull(events.deletedAt))
    .orderBy(desc(events.eventDate));
}

export async function getStaff() {
  return db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.displayName));
}
