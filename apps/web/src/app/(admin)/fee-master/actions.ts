'use server';

import { db, feeMaster, auditLogs, eq } from '@looop/db';
import { revalidatePath } from 'next/cache';
import { LOOOP_PAYMENT_METHODS, LOOOP_PLAN_CODES } from '@/lib/constants';

export interface FeeMasterFormInput {
  id?: string;
  planCode: string;
  paymentMethod: string;
  kwhMin: string;
  kwhMax: string;
  feeAmount: string;
  adminFee: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
}

function toInt(value: string, allowNull = false): number | null {
  if (value === '' || value == null) return allowNull ? null : NaN;
  const n = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(n)) return NaN;
  return Math.trunc(n);
}

export async function upsertFeeMaster(input: FeeMasterFormInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(LOOOP_PLAN_CODES as readonly string[]).includes(input.planCode)) return { success: false, error: 'プランが不正です' };
    if (!(LOOOP_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) return { success: false, error: '支払方法が不正です' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) return { success: false, error: '適用開始日を YYYY-MM-DD で入力してください' };

    const kwhMin = toInt(input.kwhMin);
    const kwhMax = toInt(input.kwhMax, true);
    const fee = toInt(input.feeAmount);
    const admin = toInt(input.adminFee);

    if (kwhMin == null || Number.isNaN(kwhMin) || kwhMin < 0) return { success: false, error: 'kWh下限が不正です' };
    if (kwhMax != null && (Number.isNaN(kwhMax) || kwhMax < kwhMin)) return { success: false, error: 'kWh上限が不正です' };
    if (fee == null || Number.isNaN(fee) || fee < 0) return { success: false, error: '手数料額が不正です' };
    if (admin == null || Number.isNaN(admin) || admin < 0) return { success: false, error: '業務管理費が不正です' };

    const now = new Date();
    if (input.id) {
      await db.update(feeMaster).set({
        planCode: input.planCode,
        paymentMethod: input.paymentMethod,
        kwhMin,
        kwhMax,
        feeAmount: fee,
        adminFee: admin,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo || null,
        note: input.note || null,
        updatedAt: now,
      }).where(eq(feeMaster.id, input.id));
      await db.insert(auditLogs).values({ action: 'update_fee_master', resourceType: 'fee_master', resourceId: input.id, diff: input, createdAt: now });
    } else {
      const result = await db.insert(feeMaster).values({
        planCode: input.planCode,
        paymentMethod: input.paymentMethod,
        kwhMin,
        kwhMax,
        feeAmount: fee,
        adminFee: admin,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo || null,
        note: input.note || null,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: feeMaster.id });
      await db.insert(auditLogs).values({ action: 'create_fee_master', resourceType: 'fee_master', resourceId: result[0]?.id ?? null, diff: input, createdAt: now });
    }
    revalidatePath('/fee-master');
    return { success: true };
  } catch (err) {
    console.error('upsertFeeMaster error:', err);
    return { success: false, error: '保存に失敗しました' };
  }
}

export async function deleteFeeMaster(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(feeMaster).where(eq(feeMaster.id, id));
    await db.insert(auditLogs).values({ action: 'delete_fee_master', resourceType: 'fee_master', resourceId: id, createdAt: new Date() });
    revalidatePath('/fee-master');
    return { success: true };
  } catch (err) {
    console.error('deleteFeeMaster error:', err);
    return { success: false, error: '削除に失敗しました' };
  }
}
