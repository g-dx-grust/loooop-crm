import { db, looopContracts, leads, users, events, eq, and, isNull } from '@looop/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KpiSummary {
  thisMonth: { applications: number; opened: number; revenue: number };
  lastMonth: { applications: number; opened: number; revenue: number };
  applicationsDelta: number | null;
  openedDelta: number | null;
  revenueDelta: number | null;
}

export interface MonthlyBar {
  yearMonth: string;
  label: string;
  applications: number;
  opened: number;
  revenue: number;
}

export interface StaffRow {
  staffName: string;
  applications: number;
  opened: number;
  revenue: number;
}

export interface EventPerformanceRow {
  eventName: string;
  venueName: string | null;
  eventDate: string | null;
  leadCount: number;
  applications: number;
  opened: number;
  revenue: number;
  avgMonthlyBill: number | null;
  cost: number | null;
}

export interface ElectricBillBand {
  label: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthStart(ym: string): string {
  return `${ym}-01`;
}

function nextMonthStart(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}-01`;
}

function prevYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${prev.y}-${String(prev.m).padStart(2, '0')}`;
}

function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function toDateKey(value: Date | string | number | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return new Date(value * 1000).toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function inMonth(value: Date | string | number | null | undefined, ym: string): boolean {
  const key = toDateKey(value);
  if (!key) return false;
  return key >= monthStart(ym) && key < nextMonthStart(ym);
}

/** 申込とみなすステータス（not_proposed / excluded / cancelled は除外） */
const APPLICATION_STATUSES = [
  'proposed',
  'interested',
  'applied',
  'under_review',
  'contracted',
  'opened',
] as const;

type ContractRow = {
  status: string;
  applicationDate: string | null;
  openedDate: string | null;
  unitPrice: number;
};

function aggregateMonth(rows: ContractRow[], ym: string) {
  const start = monthStart(ym);
  const end = nextMonthStart(ym);

  let applications = 0;
  let opened = 0;
  let revenue = 0;

  for (const row of rows) {
    if (
      row.applicationDate &&
      row.applicationDate >= start &&
      row.applicationDate < end &&
      (APPLICATION_STATUSES as readonly string[]).includes(row.status)
    ) {
      applications++;
    }
    if (
      row.openedDate &&
      row.openedDate >= start &&
      row.openedDate < end &&
      row.status === 'opened'
    ) {
      opened++;
      revenue += row.unitPrice;
    }
  }

  return { applications, opened, revenue };
}

// ---------------------------------------------------------------------------
// getKpiSummary
// ---------------------------------------------------------------------------

export async function getKpiSummary(targetMonth?: string): Promise<KpiSummary> {
  const now = new Date();
  const ym = targetMonth
    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastYm = prevYearMonth(ym);

  const rows = await db
    .select({
      status: looopContracts.status,
      applicationDate: looopContracts.applicationDate,
      openedDate: looopContracts.openedDate,
      unitPrice: looopContracts.unitPrice,
    })
    .from(looopContracts)
    .where(isNull(looopContracts.deletedAt));

  const thisMonth = aggregateMonth(rows, ym);
  const lastMonth = aggregateMonth(rows, lastYm);

  return {
    thisMonth,
    lastMonth,
    applicationsDelta: delta(thisMonth.applications, lastMonth.applications),
    openedDelta: delta(thisMonth.opened, lastMonth.opened),
    revenueDelta: delta(thisMonth.revenue, lastMonth.revenue),
  };
}

// ---------------------------------------------------------------------------
// getMonthlyTrend
// ---------------------------------------------------------------------------

export async function getMonthlyTrend(months = 6, endMonth?: string): Promise<MonthlyBar[]> {
  const now = new Date();
  const currentYm = endMonth
    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Build list of months (oldest first)
  const ymList: string[] = [];
  let ym = currentYm;
  for (let i = 0; i < months; i++) {
    ymList.unshift(ym);
    ym = prevYearMonth(ym);
  }

  const rows = await db
    .select({
      status: looopContracts.status,
      applicationDate: looopContracts.applicationDate,
      openedDate: looopContracts.openedDate,
      unitPrice: looopContracts.unitPrice,
    })
    .from(looopContracts)
    .where(isNull(looopContracts.deletedAt));

  return ymList.map((y) => {
    const agg = aggregateMonth(rows, y);
    const monthNum = parseInt(y.split('-')[1] ?? '1', 10);
    return {
      yearMonth: y,
      label: `${monthNum}月`,
      ...agg,
    };
  });
}

// ---------------------------------------------------------------------------
// getStaffPerformance
// ---------------------------------------------------------------------------

export async function getStaffPerformance(targetMonth?: string): Promise<StaffRow[]> {
  const now = new Date();
  const ym = targetMonth
    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const start = monthStart(ym);
  const end = nextMonthStart(ym);

  const rows = await db
    .select({
      staffName: users.displayName,
      status: looopContracts.status,
      applicationDate: looopContracts.applicationDate,
      openedDate: looopContracts.openedDate,
      unitPrice: looopContracts.unitPrice,
    })
    .from(looopContracts)
    .leftJoin(leads, eq(looopContracts.leadId, leads.id))
    .leftJoin(users, eq(leads.staffId, users.id))
    .where(and(isNull(looopContracts.deletedAt)));

  // Aggregate per staff in JS
  const map = new Map<string, { applications: number; opened: number; revenue: number }>();

  for (const row of rows) {
    const name = row.staffName ?? '（未割当）';
    if (!map.has(name)) {
      map.set(name, { applications: 0, opened: 0, revenue: 0 });
    }
    const acc = map.get(name)!;

    if (
      row.applicationDate &&
      row.applicationDate >= start &&
      row.applicationDate < end &&
      (APPLICATION_STATUSES as readonly string[]).includes(row.status)
    ) {
      acc.applications++;
    }
    if (
      row.openedDate &&
      row.openedDate >= start &&
      row.openedDate < end &&
      row.status === 'opened'
    ) {
      acc.opened++;
      acc.revenue += row.unitPrice;
    }
  }

  return Array.from(map.entries())
    .map(([staffName, counts]) => ({ staffName, ...counts }))
    .sort((a, b) => b.applications - a.applications);
}

export async function getEventPerformance(targetMonth?: string): Promise<EventPerformanceRow[]> {
  const now = new Date();
  const ym = targetMonth
    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const rows = await db
    .select({
      eventId: events.id,
      eventName: events.eventName,
      venueName: events.venueName,
      eventDate: events.eventDate,
      cost: events.cost,
      leadCreatedAt: leads.createdAt,
      status: looopContracts.status,
      applicationDate: looopContracts.applicationDate,
      openedDate: looopContracts.openedDate,
      unitPrice: looopContracts.unitPrice,
      monthlyElectricBill: looopContracts.monthlyElectricBill,
    })
    .from(events)
    .leftJoin(leads, eq(leads.eventId, events.id))
    .leftJoin(
      looopContracts,
      and(
        eq(looopContracts.leadId, leads.id),
        isNull(looopContracts.deletedAt),
      ),
    )
    .where(isNull(events.deletedAt));

  const map = new Map<string, {
    eventName: string;
    venueName: string | null;
    eventDate: string | null;
    leadCount: number;
    applications: number;
    opened: number;
    revenue: number;
    billTotal: number;
    billCount: number;
    cost: number | null;
  }>();

  for (const row of rows) {
    if (!map.has(row.eventId)) {
      map.set(row.eventId, {
        eventName: row.eventName,
        venueName: row.venueName ?? null,
        eventDate: row.eventDate ?? null,
        leadCount: 0,
        applications: 0,
        opened: 0,
        revenue: 0,
        billTotal: 0,
        billCount: 0,
        cost: row.cost ?? null,
      });
    }
    const acc = map.get(row.eventId)!;

    if (inMonth(row.leadCreatedAt, ym)) {
      acc.leadCount++;
    }
    if (
      row.applicationDate &&
      inMonth(row.applicationDate, ym) &&
      (APPLICATION_STATUSES as readonly string[]).includes(row.status ?? '')
    ) {
      acc.applications++;
    }
    if (row.openedDate && inMonth(row.openedDate, ym) && row.status === 'opened') {
      acc.opened++;
      acc.revenue += row.unitPrice ?? 0;
    }
    if (row.monthlyElectricBill != null && inMonth(row.leadCreatedAt, ym)) {
      acc.billTotal += row.monthlyElectricBill;
      acc.billCount++;
    }
  }

  return Array.from(map.values())
    .map((row) => ({
      eventName: row.eventName,
      venueName: row.venueName,
      eventDate: row.eventDate,
      leadCount: row.leadCount,
      applications: row.applications,
      opened: row.opened,
      revenue: row.revenue,
      avgMonthlyBill: row.billCount > 0 ? Math.round(row.billTotal / row.billCount) : null,
      cost: row.cost,
    }))
    .filter((row) => row.leadCount > 0 || row.applications > 0 || row.opened > 0)
    .sort((a, b) => b.leadCount - a.leadCount || b.applications - a.applications);
}

export async function getElectricBillBands(targetMonth?: string): Promise<ElectricBillBand[]> {
  const now = new Date();
  const ym = targetMonth
    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const rows = await db
    .select({
      leadCreatedAt: leads.createdAt,
      monthlyElectricBill: looopContracts.monthlyElectricBill,
    })
    .from(looopContracts)
    .leftJoin(leads, eq(looopContracts.leadId, leads.id))
    .where(isNull(looopContracts.deletedAt));

  const bands = [
    { label: '〜4,999円', min: 0, max: 4999, count: 0 },
    { label: '5,000〜9,999円', min: 5000, max: 9999, count: 0 },
    { label: '10,000〜14,999円', min: 10000, max: 14999, count: 0 },
    { label: '15,000〜19,999円', min: 15000, max: 19999, count: 0 },
    { label: '20,000円〜', min: 20000, max: Number.POSITIVE_INFINITY, count: 0 },
  ];

  for (const row of rows) {
    if (!inMonth(row.leadCreatedAt, ym)) continue;
    const bill = row.monthlyElectricBill;
    if (bill == null) continue;
    const band = bands.find((candidate) => bill >= candidate.min && bill <= candidate.max);
    if (band) band.count++;
  }

  return bands.map(({ label, count }) => ({ label, count }));
}
