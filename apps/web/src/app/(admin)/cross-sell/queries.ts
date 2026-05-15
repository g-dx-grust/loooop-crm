import { db, crossSellOpportunities, customers, leads, users, eq, and, isNull, isNotNull, desc } from '@looop/db';

export interface CrossSellFilters {
  productType?: string;
  status?: string;
  interestRank?: string;
  overdue?: boolean;
  staffId?: string;
}

export interface CrossSellListItem {
  id: string;
  customerId: string;
  customerName: string;
  productType: string;
  interestRank: string | null;
  status: string;
  nextActionDate: string | null;
  staffName: string | null;
  expectedRevenue: number | null;
  actualRevenue: number | null;
  memo: string | null;
  isOverdue: boolean;
}

export interface CrossSellSummary {
  totalWon: number;
  thisMonthWon: number;
  totalRevenue: number;
  overdueCount: number;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function todayString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

const OVERDUE_EXCLUDED_STATUSES = new Set(['won', 'lost', 'excluded']);

function isItemOverdue(nextActionDate: string | null, status: string): boolean {
  if (!nextActionDate) return false;
  if (OVERDUE_EXCLUDED_STATUSES.has(status)) return false;
  return nextActionDate < todayString();
}

export async function getCrossSellOpportunities(
  filters: CrossSellFilters,
): Promise<CrossSellListItem[]> {
  const rows = await db
    .select({
      id: crossSellOpportunities.id,
      customerId: crossSellOpportunities.customerId,
      customerName: customers.name,
      productType: crossSellOpportunities.productType,
      interestRank: crossSellOpportunities.interestRank,
      status: crossSellOpportunities.status,
      nextActionDate: crossSellOpportunities.nextActionDate,
      staffName: users.displayName,
      expectedRevenue: crossSellOpportunities.expectedRevenue,
      actualRevenue: crossSellOpportunities.actualRevenue,
      memo: crossSellOpportunities.memo,
    })
    .from(crossSellOpportunities)
    .innerJoin(customers, eq(crossSellOpportunities.customerId, customers.id))
    .leftJoin(leads, eq(customers.id, leads.customerId))
    .leftJoin(users, eq(leads.staffId, users.id))
    .where(
      and(
        isNull(crossSellOpportunities.deletedAt),
        filters.productType
          ? eq(crossSellOpportunities.productType, filters.productType)
          : undefined,
        filters.status ? eq(crossSellOpportunities.status, filters.status) : undefined,
        filters.interestRank
          ? eq(crossSellOpportunities.interestRank, filters.interestRank)
          : undefined,
        filters.staffId ? eq(leads.staffId, filters.staffId) : undefined,
      ),
    )
    .orderBy(desc(crossSellOpportunities.updatedAt));

  // Deduplicate customers (multiple leads might match)
  const seen = new Set<string>();
  const deduped = rows
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map((r) => {
      const nextActionDate = r.nextActionDate ?? null;
      const status = r.status;
      return {
        id: r.id,
        customerId: r.customerId,
        customerName: r.customerName,
        productType: r.productType,
        interestRank: r.interestRank ?? null,
        status,
        nextActionDate,
        staffName: r.staffName ?? null,
        expectedRevenue: r.expectedRevenue ?? null,
        actualRevenue: r.actualRevenue ?? null,
        memo: r.memo ?? null,
        isOverdue: isItemOverdue(nextActionDate, status),
      };
    });

  if (filters.overdue) {
    return deduped.filter((r) => r.isOverdue);
  }

  return deduped;
}

export interface CrossSellStaffOption {
  id: string;
  displayName: string;
}

export async function getCrossSellStaffOptions(): Promise<CrossSellStaffOption[]> {
  const rows = await db
    .selectDistinct({ id: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(leads, eq(leads.staffId, users.id))
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .innerJoin(crossSellOpportunities, eq(crossSellOpportunities.customerId, customers.id))
    .where(and(isNull(crossSellOpportunities.deletedAt), isNotNull(leads.staffId)))
    .orderBy(users.displayName);
  return rows.map((r) => ({ id: r.id, displayName: r.displayName }));
}

export async function getCrossSellSummary(): Promise<CrossSellSummary> {
  const ym = currentYearMonth();

  const all = await db
    .select({
      status: crossSellOpportunities.status,
      actualRevenue: crossSellOpportunities.actualRevenue,
      updatedAt: crossSellOpportunities.updatedAt,
      nextActionDate: crossSellOpportunities.nextActionDate,
    })
    .from(crossSellOpportunities)
    .where(isNull(crossSellOpportunities.deletedAt));

  let totalWon = 0;
  let thisMonthWon = 0;
  let totalRevenue = 0;
  let overdueCount = 0;

  for (const row of all) {
    if (row.status === 'won') {
      totalWon++;
      if (row.actualRevenue) totalRevenue += row.actualRevenue;

      const updatedDate = row.updatedAt
        ? row.updatedAt.toISOString().slice(0, 7)
        : '';
      if (updatedDate === ym) {
        thisMonthWon++;
      }
    }

    if (isItemOverdue(row.nextActionDate ?? null, row.status)) {
      overdueCount++;
    }
  }

  return { totalWon, thisMonthWon, totalRevenue, overdueCount };
}
