import { db, feeMaster, asc } from '@looop/db';

export interface FeeMasterRow {
  id: string;
  planCode: string;
  paymentMethod: string;
  kwhMin: number;
  kwhMax: number | null;
  feeAmount: number;
  adminFee: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
}

export async function getFeeMaster(): Promise<FeeMasterRow[]> {
  const rows = await db
    .select()
    .from(feeMaster)
    .orderBy(asc(feeMaster.planCode), asc(feeMaster.paymentMethod), asc(feeMaster.effectiveFrom), asc(feeMaster.kwhMin));
  return rows.map((r) => ({
    id: r.id,
    planCode: r.planCode,
    paymentMethod: r.paymentMethod,
    kwhMin: r.kwhMin,
    kwhMax: r.kwhMax ?? null,
    feeAmount: r.feeAmount,
    adminFee: r.adminFee,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo ?? null,
    note: r.note ?? null,
  }));
}
