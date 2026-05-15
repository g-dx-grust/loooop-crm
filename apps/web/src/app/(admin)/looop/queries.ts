import { db, looopContracts, customers, leads, events, users, eq, and, isNull, desc, isNotNull } from '@looop/db';

export interface LooopCustomerOption {
  id: string;
  name: string;
}

export async function getLooopCustomerOptions(): Promise<LooopCustomerOption[]> {
  const rows = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(isNull(customers.deletedAt))
    .orderBy(customers.name);
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export interface StaffOption {
  id: string;
  displayName: string;
}

export async function getLooopStaffOptions(): Promise<StaffOption[]> {
  const rows = await db
    .selectDistinct({ id: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(leads, eq(leads.staffId, users.id))
    .innerJoin(looopContracts, eq(looopContracts.leadId, leads.id))
    .where(and(isNull(looopContracts.deletedAt), isNotNull(leads.staffId)))
    .orderBy(users.displayName);
  return rows.map((r) => ({ id: r.id, displayName: r.displayName }));
}

export interface LooopContractFilters {
  status?: string;
  staffId?: string;
}

export interface LooopContractListItem {
  id: string;
  customerName: string;
  eventName: string | null;
  staffName: string | null;
  applicationDate: string | null;
  status: string;
  unitPrice: number;
  revenueMonth: string | null;
  paymentStatus: string;
  customerId: string;
}

export interface LooopSummary {
  thisMonthApplications: number;
  thisMonthOpened: number;
  thisMonthRevenue: number;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getLooopContracts(filters: LooopContractFilters): Promise<LooopContractListItem[]> {
  const rows = await db
    .select({
      id: looopContracts.id,
      customerName: customers.name,
      eventName: events.eventName,
      staffName: users.displayName,
      applicationDate: looopContracts.applicationDate,
      status: looopContracts.status,
      unitPrice: looopContracts.unitPrice,
      revenueMonth: looopContracts.revenueMonth,
      paymentStatus: looopContracts.paymentStatus,
      customerId: looopContracts.customerId,
    })
    .from(looopContracts)
    .innerJoin(customers, eq(looopContracts.customerId, customers.id))
    .leftJoin(leads, eq(looopContracts.leadId, leads.id))
    .leftJoin(events, eq(leads.eventId, events.id))
    .leftJoin(users, eq(leads.staffId, users.id))
    .where(
      and(
        isNull(looopContracts.deletedAt),
        filters.status ? eq(looopContracts.status, filters.status) : undefined,
        filters.staffId ? eq(leads.staffId, filters.staffId) : undefined,
      ),
    )
    .orderBy(desc(looopContracts.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    eventName: r.eventName ?? null,
    staffName: r.staffName ?? null,
    applicationDate: r.applicationDate ?? null,
    status: r.status,
    unitPrice: r.unitPrice,
    revenueMonth: r.revenueMonth ?? null,
    paymentStatus: r.paymentStatus,
    customerId: r.customerId,
  }));
}

export async function getLooopSummary(): Promise<LooopSummary> {
  const ym = currentYearMonth();

  // today's year/month as start date for filtering
  const ymStart = `${ym}-01`;

  const all = await db
    .select({
      status: looopContracts.status,
      applicationDate: looopContracts.applicationDate,
      openedDate: looopContracts.openedDate,
      unitPrice: looopContracts.unitPrice,
    })
    .from(looopContracts)
    .where(isNull(looopContracts.deletedAt));

  let thisMonthApplications = 0;
  let thisMonthOpened = 0;
  let thisMonthRevenue = 0;

  for (const row of all) {
    // 今月の申込数: applicationDate が今月のもの (applied/completed)
    if (
      row.applicationDate &&
      row.applicationDate >= ymStart &&
      row.applicationDate < nextMonthStart(ym) &&
      ['applied', 'completed'].includes(row.status)
    ) {
      thisMonthApplications++;
    }
    // 今月の完了数: openedDate が今月のもの
    if (
      row.openedDate &&
      row.openedDate >= ymStart &&
      row.openedDate < nextMonthStart(ym) &&
      row.status === 'completed'
    ) {
      thisMonthOpened++;
      thisMonthRevenue += row.unitPrice;
    }
  }

  return { thisMonthApplications, thisMonthOpened, thisMonthRevenue };
}

function nextMonthStart(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}-01`;
}
