import { db, refunds, customers, users, eq, and, isNull, desc } from '@looop/db';

export interface RefundListItem {
  id: string;
  customerId: string;
  customerName: string;
  staffName: string | null;
  reasonCode: string;
  cancelDate: string | null;
  terminationDate: string | null;
  supplyStartDate: string | null;
  refundMonth: string | null;
  refundAmount: number;
  note: string | null;
  createdAt: Date | null;
}

export async function getRefunds(filters: { month?: string }): Promise<RefundListItem[]> {
  const rows = await db
    .select({
      id: refunds.id,
      customerId: refunds.customerId,
      customerName: customers.name,
      staffName: users.displayName,
      reasonCode: refunds.reasonCode,
      cancelDate: refunds.cancelDate,
      terminationDate: refunds.terminationDate,
      supplyStartDate: refunds.supplyStartDate,
      refundMonth: refunds.refundMonth,
      refundAmount: refunds.refundAmount,
      note: refunds.note,
      createdAt: refunds.createdAt,
    })
    .from(refunds)
    .innerJoin(customers, eq(refunds.customerId, customers.id))
    .leftJoin(users, eq(customers.createdBy, users.id))
    .where(
      and(
        isNull(refunds.deletedAt),
        filters.month ? eq(refunds.refundMonth, filters.month) : undefined,
      ),
    )
    .orderBy(desc(refunds.createdAt));

  return rows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName,
    staffName: r.staffName ?? null,
    reasonCode: r.reasonCode,
    cancelDate: r.cancelDate ?? null,
    terminationDate: r.terminationDate ?? null,
    supplyStartDate: r.supplyStartDate ?? null,
    refundMonth: r.refundMonth ?? null,
    refundAmount: r.refundAmount,
    note: r.note ?? null,
    createdAt: r.createdAt ?? null,
  }));
}
