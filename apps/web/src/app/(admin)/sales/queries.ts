/**
 * 売上集計クエリ — 仕様書 §8
 * - 月別申込/契約/開通/キャンセル件数
 * - 担当者別 獲得件数 / 手数料 / 差引手数料
 * - 支払方法別件数 / kWh区分別件数
 */
import {
  db,
  electricityBills,
  looopContracts,
  crossSellOpportunities,
  refunds,
  customers,
  users,
  eq,
  and,
  isNull,
  sql,
} from '@looop/db';

export interface MonthlyApplicationRow {
  month: string;
  applied: number;
  contracted: number;
  opened: number;
  cancelled: number;
}

export async function getMonthlyApplicationCounts(months = 6): Promise<MonthlyApplicationRow[]> {
  const rows = await db
    .select({
      status: looopContracts.status,
      applicationDate: looopContracts.applicationDate,
      contractDate: looopContracts.contractDate,
      openedDate: looopContracts.openedDate,
      cancelDate: looopContracts.cancelDate,
    })
    .from(looopContracts)
    .where(isNull(looopContracts.deletedAt));

  const now = new Date();
  const monthsList: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const map = new Map<string, MonthlyApplicationRow>();
  for (const m of monthsList) {
    map.set(m, { month: m, applied: 0, contracted: 0, opened: 0, cancelled: 0 });
  }

  for (const r of rows) {
    if (r.applicationDate) {
      const m = r.applicationDate.slice(0, 7);
      const row = map.get(m);
      if (row) row.applied++;
    }
    if (r.contractDate) {
      const m = r.contractDate.slice(0, 7);
      const row = map.get(m);
      if (row) row.contracted++;
    }
    if (r.openedDate) {
      const m = r.openedDate.slice(0, 7);
      const row = map.get(m);
      if (row) row.opened++;
    }
    if (r.cancelDate) {
      const m = r.cancelDate.slice(0, 7);
      const row = map.get(m);
      if (row) row.cancelled++;
    }
  }

  return Array.from(map.values());
}

export interface MonthlyRevenueRow {
  month: string;
  billCount: number;
  feeAmount: number;
  netFee: number;
  refundCount: number;
  refundAmount: number;
}

export async function getMonthlyRevenue(months = 6): Promise<MonthlyRevenueRow[]> {
  const billRows = await db
    .select({
      month: electricityBills.billMonth,
      count: sql<number>`count(*)`,
      fee: sql<number>`coalesce(sum(${electricityBills.feeAmount}), 0)`,
      net: sql<number>`coalesce(sum(${electricityBills.netFee}), 0)`,
    })
    .from(electricityBills)
    .where(isNull(electricityBills.deletedAt))
    .groupBy(electricityBills.billMonth);

  const refundRows = await db
    .select({
      month: refunds.refundMonth,
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(${refunds.refundAmount}), 0)`,
    })
    .from(refunds)
    .where(isNull(refunds.deletedAt))
    .groupBy(refunds.refundMonth);

  const now = new Date();
  const monthsList: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const map = new Map<string, MonthlyRevenueRow>();
  for (const m of monthsList) {
    map.set(m, { month: m, billCount: 0, feeAmount: 0, netFee: 0, refundCount: 0, refundAmount: 0 });
  }

  for (const r of billRows) {
    const row = map.get(r.month);
    if (row) {
      row.billCount = Number(r.count);
      row.feeAmount = Number(r.fee);
      row.netFee = Number(r.net);
    }
  }
  for (const r of refundRows) {
    if (!r.month) continue;
    const row = map.get(r.month);
    if (row) {
      row.refundCount = Number(r.count);
      row.refundAmount = Number(r.amount);
    }
  }

  return Array.from(map.values());
}

export interface StaffSalesRow {
  staffId: string;
  staffName: string;
  customerCount: number;
  applicationCount: number;
  openedCount: number;
  cancelCount: number;
  paidCount: number;
  unbilledCount: number;
  billCount: number;
  /** electricity_bills.feeAmount の合計（グロス手数料） */
  feeTotal: number;
  /** electricity_bills.netFee の合計（Looopでんき売上） */
  looopRevenue: number;
  /** cross_sell_opportunities.actualRevenue の合計（成約済みのみ） */
  crossSellRevenue: number;
  /** looopRevenue + crossSellRevenue */
  totalRevenue: number;
}

export async function getStaffSales(month?: string): Promise<StaffSalesRow[]> {
  // Customer base count by staff
  const customersByStaff = await db
    .select({
      staffId: customers.createdBy,
      staffName: users.displayName,
      count: sql<number>`count(*)`,
    })
    .from(customers)
    .leftJoin(users, eq(customers.createdBy, users.id))
    .where(isNull(customers.deletedAt))
    .groupBy(customers.createdBy, users.displayName);

  // Applications / opened / cancelled / paid / unbilled by staff
  const contractsByStaff = await db
    .select({
      staffId: customers.createdBy,
      applied: sql<number>`coalesce(sum(case when ${looopContracts.applicationDate} is not null then 1 else 0 end), 0)`,
      opened: sql<number>`coalesce(sum(case when ${looopContracts.status} = 'opened' then 1 else 0 end), 0)`,
      completed: sql<number>`coalesce(sum(case when ${looopContracts.status} = 'completed' then 1 else 0 end), 0)`,
      cancelled: sql<number>`coalesce(sum(case when ${looopContracts.status} = 'cancelled' then 1 else 0 end), 0)`,
      paid: sql<number>`coalesce(sum(case when ${looopContracts.paymentStatus} = 'paid' then 1 else 0 end), 0)`,
      unbilled: sql<number>`coalesce(sum(case when ${looopContracts.paymentStatus} = 'unbilled' and ${looopContracts.status} != 'cancelled' then 1 else 0 end), 0)`,
    })
    .from(looopContracts)
    .innerJoin(customers, eq(looopContracts.customerId, customers.id))
    .where(and(isNull(looopContracts.deletedAt), isNull(customers.deletedAt)))
    .groupBy(customers.createdBy);

  // Looop electricity bill revenue by staff
  const billsByStaff = await db
    .select({
      staffId: customers.createdBy,
      count: sql<number>`count(*)`,
      fee: sql<number>`coalesce(sum(${electricityBills.feeAmount}), 0)`,
      net: sql<number>`coalesce(sum(${electricityBills.netFee}), 0)`,
    })
    .from(electricityBills)
    .innerJoin(customers, eq(electricityBills.customerId, customers.id))
    .where(
      and(
        isNull(electricityBills.deletedAt),
        month ? eq(electricityBills.billMonth, month) : undefined,
      ),
    )
    .groupBy(customers.createdBy);

  // Cross-sell revenue by staff (status='won' のみ)
  const crossSellByStaff = await db
    .select({
      staffId: customers.createdBy,
      revenue: sql<number>`coalesce(sum(${crossSellOpportunities.actualRevenue}), 0)`,
    })
    .from(crossSellOpportunities)
    .innerJoin(customers, eq(crossSellOpportunities.customerId, customers.id))
    .where(
      and(
        isNull(crossSellOpportunities.deletedAt),
        isNull(customers.deletedAt),
        eq(crossSellOpportunities.status, 'won'),
      ),
    )
    .groupBy(customers.createdBy);

  const map = new Map<string, StaffSalesRow>();
  for (const r of customersByStaff) {
    const id = r.staffId ?? '';
    map.set(id, {
      staffId: id,
      staffName: r.staffName ?? '— 未割当 —',
      customerCount: Number(r.count),
      applicationCount: 0,
      openedCount: 0,
      cancelCount: 0,
      paidCount: 0,
      unbilledCount: 0,
      billCount: 0,
      feeTotal: 0,
      looopRevenue: 0,
      crossSellRevenue: 0,
      totalRevenue: 0,
    });
  }
  for (const r of contractsByStaff) {
    const id = r.staffId ?? '';
    const row = map.get(id);
    if (row) {
      row.applicationCount = Number(r.applied);
      row.openedCount = Number(r.opened) + Number(r.completed);
      row.cancelCount = Number(r.cancelled);
      row.paidCount = Number(r.paid);
      row.unbilledCount = Number(r.unbilled);
    }
  }
  for (const r of billsByStaff) {
    const id = r.staffId ?? '';
    const row = map.get(id);
    if (row) {
      row.billCount = Number(r.count);
      row.feeTotal = Number(r.fee);
      row.looopRevenue = Number(r.net);
    }
  }
  for (const r of crossSellByStaff) {
    const id = r.staffId ?? '';
    const row = map.get(id);
    if (row) {
      row.crossSellRevenue = Number(r.revenue);
    }
  }

  for (const row of map.values()) {
    row.totalRevenue = row.looopRevenue + row.crossSellRevenue;
  }

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export interface PaymentMethodCount {
  paymentMethod: string;
  count: number;
}

export async function getPaymentMethodBreakdown(month?: string): Promise<PaymentMethodCount[]> {
  const rows = await db
    .select({
      paymentMethod: electricityBills.paymentMethod,
      count: sql<number>`count(*)`,
    })
    .from(electricityBills)
    .where(
      and(
        isNull(electricityBills.deletedAt),
        month ? eq(electricityBills.billMonth, month) : undefined,
      ),
    )
    .groupBy(electricityBills.paymentMethod);
  return rows.map((r) => ({ paymentMethod: r.paymentMethod, count: Number(r.count) }));
}

export interface KwhTierCount {
  label: string;
  count: number;
}

const KWH_TIERS: Array<{ label: string; min: number; max: number | null }> = [
  { label: '〜199', min: 0, max: 199 },
  { label: '200〜499', min: 200, max: 499 },
  { label: '500〜749', min: 500, max: 749 },
  { label: '750〜999', min: 750, max: 999 },
  { label: '1000〜', min: 1000, max: null },
  { label: '未入力(最低基準)', min: -1, max: -1 },
];

export async function getKwhTierBreakdown(month?: string): Promise<KwhTierCount[]> {
  const rows = await db
    .select({
      usageKwh: electricityBills.usageKwh,
      minimumApplied: electricityBills.minimumApplied,
    })
    .from(electricityBills)
    .where(
      and(
        isNull(electricityBills.deletedAt),
        month ? eq(electricityBills.billMonth, month) : undefined,
      ),
    );

  const counts = KWH_TIERS.map((t) => ({ label: t.label, count: 0 }));
  for (const r of rows) {
    if (r.usageKwh == null || r.minimumApplied) {
      counts[5]!.count++;
      continue;
    }
    const idx = KWH_TIERS.findIndex(
      (t) => t.min >= 0 && r.usageKwh! >= t.min && (t.max == null || r.usageKwh! <= t.max),
    );
    if (idx >= 0) counts[idx]!.count++;
  }
  return counts;
}
