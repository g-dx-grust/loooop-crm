import { db, looopContracts, leads, users, eq, and, isNull } from '@looop/db';

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
