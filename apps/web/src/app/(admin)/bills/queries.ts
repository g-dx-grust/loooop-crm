import { db, electricityBills, customers, users, eq, and, isNull, desc, sql } from '@looop/db';

export interface BillFilters {
  month?: string;
  staffId?: string;
  refundOnly?: boolean;
  paymentMethod?: string;
}

export interface BillListItem {
  id: string;
  customerId: string;
  customerName: string;
  staffName: string | null;
  billMonth: string;
  usageKwh: number | null;
  electricFee: number | null;
  paymentMethod: string;
  planCode: string;
  applicationMonth: string | null;
  contractMonth: string | null;
  supplyStartDate: string | null;
  expectedPaymentMonth: string | null;
  paidAmount: number | null;
  feeAmount: number;
  adminFee: number;
  netFee: number;
  minimumApplied: boolean;
  refundFlagged: boolean;
  note: string | null;
}

export async function getBills(filters: BillFilters): Promise<BillListItem[]> {
  const rows = await db
    .select({
      id: electricityBills.id,
      customerId: electricityBills.customerId,
      customerName: customers.name,
      staffName: users.displayName,
      billMonth: electricityBills.billMonth,
      usageKwh: electricityBills.usageKwh,
      electricFee: electricityBills.electricFee,
      paymentMethod: electricityBills.paymentMethod,
      planCode: electricityBills.planCode,
      applicationMonth: electricityBills.applicationMonth,
      contractMonth: electricityBills.contractMonth,
      supplyStartDate: electricityBills.supplyStartDate,
      expectedPaymentMonth: electricityBills.expectedPaymentMonth,
      paidAmount: electricityBills.paidAmount,
      feeAmount: electricityBills.feeAmount,
      adminFee: electricityBills.adminFee,
      netFee: electricityBills.netFee,
      minimumApplied: electricityBills.minimumApplied,
      refundFlagged: electricityBills.refundFlagged,
      note: electricityBills.note,
    })
    .from(electricityBills)
    .innerJoin(customers, eq(electricityBills.customerId, customers.id))
    .leftJoin(users, eq(customers.createdBy, users.id))
    .where(
      and(
        isNull(electricityBills.deletedAt),
        filters.month ? eq(electricityBills.billMonth, filters.month) : undefined,
        filters.paymentMethod ? eq(electricityBills.paymentMethod, filters.paymentMethod) : undefined,
        filters.staffId ? eq(customers.createdBy, filters.staffId) : undefined,
        filters.refundOnly ? eq(electricityBills.refundFlagged, 1) : undefined,
      ),
    )
    .orderBy(desc(electricityBills.billMonth), desc(electricityBills.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName,
    staffName: r.staffName ?? null,
    billMonth: r.billMonth,
    usageKwh: r.usageKwh ?? null,
    electricFee: r.electricFee ?? null,
    paymentMethod: r.paymentMethod,
    planCode: r.planCode,
    applicationMonth: r.applicationMonth ?? null,
    contractMonth: r.contractMonth ?? null,
    supplyStartDate: r.supplyStartDate ?? null,
    expectedPaymentMonth: r.expectedPaymentMonth ?? null,
    paidAmount: r.paidAmount ?? null,
    feeAmount: r.feeAmount,
    adminFee: r.adminFee,
    netFee: r.netFee,
    minimumApplied: Boolean(r.minimumApplied),
    refundFlagged: Boolean(r.refundFlagged),
    note: r.note ?? null,
  }));
}

export interface BillSummary {
  totalCount: number;
  totalFee: number;
  totalNet: number;
  refundCount: number;
}

export async function getBillSummary(filters: BillFilters): Promise<BillSummary> {
  const result = await db
    .select({
      totalCount: sql<number>`count(*)`,
      totalFee: sql<number>`coalesce(sum(${electricityBills.feeAmount}), 0)`,
      totalNet: sql<number>`coalesce(sum(${electricityBills.netFee}), 0)`,
      refundCount: sql<number>`coalesce(sum(case when ${electricityBills.refundFlagged} = 1 then 1 else 0 end), 0)`,
    })
    .from(electricityBills)
    .innerJoin(customers, eq(electricityBills.customerId, customers.id))
    .where(
      and(
        isNull(electricityBills.deletedAt),
        filters.month ? eq(electricityBills.billMonth, filters.month) : undefined,
        filters.paymentMethod ? eq(electricityBills.paymentMethod, filters.paymentMethod) : undefined,
        filters.staffId ? eq(customers.createdBy, filters.staffId) : undefined,
      ),
    );

  const r = result[0];
  return {
    totalCount: Number(r?.totalCount ?? 0),
    totalFee: Number(r?.totalFee ?? 0),
    totalNet: Number(r?.totalNet ?? 0),
    refundCount: Number(r?.refundCount ?? 0),
  };
}

export interface CustomerOption {
  id: string;
  name: string;
  staffName: string | null;
}

export async function getCustomerOptions(): Promise<CustomerOption[]> {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      staffName: users.displayName,
    })
    .from(customers)
    .leftJoin(users, eq(customers.createdBy, users.id))
    .where(isNull(customers.deletedAt))
    .orderBy(customers.name);
  return rows.map((r) => ({ id: r.id, name: r.name, staffName: r.staffName ?? null }));
}

export interface StaffOption {
  id: string;
  name: string;
}

export async function getStaffOptions(): Promise<StaffOption[]> {
  const rows = await db
    .select({ id: users.id, name: users.displayName })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(users.displayName);
  return rows.map((r) => ({ id: r.id, name: r.name }));
}
