'use server';

import {
  db,
  electricityBills,
  refunds,
  looopContracts,
  auditLogs,
  eq,
  and,
  isNull,
  desc,
} from '@looop/db';
import { revalidatePath } from 'next/cache';
import { calculateFee } from '@/lib/fee-calc';
import { LOOOP_PAYMENT_METHODS, LOOOP_PLAN_CODES, REFUND_REASONS } from '@/lib/constants';

export interface BillFormInput {
  id?: string;
  customerId: string;
  billMonth: string;
  usageKwh: string | null;
  electricFee: string | null;
  paymentMethod: string;
  planCode: string;
  applicationMonth?: string | null;
  contractMonth?: string | null;
  supplyStartDate?: string | null;
  expectedPaymentMonth?: string | null;
  paidAmount?: string | null;
  refundFlagged?: boolean;
  note?: string | null;
}

function parseInteger(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function validateMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export async function upsertBill(
  input: BillFormInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!input.customerId) return { success: false, error: '顧客を選択してください' };
    if (!validateMonth(input.billMonth)) return { success: false, error: '明細対象月は YYYY-MM 形式で入力してください' };
    if (!(LOOOP_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) {
      return { success: false, error: '支払方法が不正です' };
    }
    if (!(LOOOP_PLAN_CODES as readonly string[]).includes(input.planCode)) {
      return { success: false, error: '対象プランが不正です' };
    }

    const usageKwh = parseInteger(input.usageKwh);
    const electricFee = parseInteger(input.electricFee);
    const paidAmount = parseInteger(input.paidAmount);

    // 適用日: 明細対象月の1日 (季節変動係数は将来対応 — 現時点は明細kWh直接入力)
    const effectiveDate = `${input.billMonth}-01`;
    const calc = await calculateFee({
      planCode: input.planCode,
      paymentMethod: input.paymentMethod,
      usageKwh,
      effectiveDate,
    });

    const now = new Date();
    const refundFlag = Boolean(input.refundFlagged);

    if (input.id) {
      const before = await db.select().from(electricityBills).where(eq(electricityBills.id, input.id)).limit(1);
      if (!before[0]) return { success: false, error: '明細が見つかりません' };

      await db
        .update(electricityBills)
        .set({
          customerId: input.customerId,
          billMonth: input.billMonth,
          usageKwh,
          electricFee,
          paymentMethod: input.paymentMethod,
          planCode: input.planCode,
          applicationMonth: input.applicationMonth || null,
          contractMonth: input.contractMonth || null,
          supplyStartDate: input.supplyStartDate || null,
          expectedPaymentMonth: input.expectedPaymentMonth || null,
          paidAmount,
          feeAmount: calc.feeAmount,
          adminFee: calc.adminFee,
          netFee: calc.netFee,
          minimumApplied: calc.minimumApplied,
          refundFlagged: refundFlag,
          feeMasterId: calc.feeMasterId,
          note: input.note || null,
          updatedAt: now,
        })
        .where(eq(electricityBills.id, input.id));

      await db.insert(auditLogs).values({
        action: 'update_bill',
        resourceType: 'electricity_bill',
        resourceId: input.id,
        diff: { before: before[0], after: { ...input, fee: calc.feeAmount, netFee: calc.netFee } },
        createdAt: now,
      });

      revalidatePath('/bills');
      revalidatePath('/kpi');
      return { success: true, id: input.id };
    }

    // Insert: derive contract id if exists
    const contract = await db
      .select({ id: looopContracts.id })
      .from(looopContracts)
      .where(and(eq(looopContracts.customerId, input.customerId), isNull(looopContracts.deletedAt)))
      .orderBy(desc(looopContracts.updatedAt))
      .limit(1);

    const insertResult = await db
      .insert(electricityBills)
      .values({
        customerId: input.customerId,
        contractId: contract[0]?.id ?? null,
        billMonth: input.billMonth,
        usageKwh,
        electricFee,
        paymentMethod: input.paymentMethod,
        planCode: input.planCode,
        applicationMonth: input.applicationMonth || null,
        contractMonth: input.contractMonth || null,
        supplyStartDate: input.supplyStartDate || null,
        expectedPaymentMonth: input.expectedPaymentMonth || null,
        paidAmount,
        feeAmount: calc.feeAmount,
        adminFee: calc.adminFee,
        netFee: calc.netFee,
        minimumApplied: calc.minimumApplied,
        refundFlagged: refundFlag,
        feeMasterId: calc.feeMasterId,
        note: input.note || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: electricityBills.id });

    const newId = insertResult[0]?.id;

    await db.insert(auditLogs).values({
      action: 'create_bill',
      resourceType: 'electricity_bill',
      resourceId: newId ?? null,
      diff: { ...input, fee: calc.feeAmount, netFee: calc.netFee },
      createdAt: now,
    });

    revalidatePath('/bills');
    revalidatePath('/kpi');
    return { success: true, id: newId };
  } catch (err) {
    console.error('upsertBill error:', err);
    const msg = err instanceof Error && err.message.includes('UNIQUE')
      ? '同じ顧客・対象月の明細が既に存在します'
      : '保存に失敗しました';
    return { success: false, error: msg };
  }
}

export async function deleteBill(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    await db.update(electricityBills).set({ deletedAt: now }).where(eq(electricityBills.id, id));
    await db.insert(auditLogs).values({
      action: 'delete_bill',
      resourceType: 'electricity_bill',
      resourceId: id,
      createdAt: now,
    });
    revalidatePath('/bills');
    return { success: true };
  } catch (err) {
    console.error('deleteBill error:', err);
    return { success: false, error: '削除に失敗しました' };
  }
}

export interface RefundFormInput {
  customerId: string;
  billId?: string | null;
  reasonCode: string;
  cancelDate?: string | null;
  terminationDate?: string | null;
  supplyStartDate?: string | null;
  refundMonth: string;
  refundAmount: string;
  note?: string | null;
}

export async function createRefund(
  input: RefundFormInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!input.customerId) return { success: false, error: '顧客を選択してください' };
    if (!(REFUND_REASONS as readonly string[]).includes(input.reasonCode)) {
      return { success: false, error: '返還理由が不正です' };
    }
    if (!validateMonth(input.refundMonth)) return { success: false, error: '返還月は YYYY-MM 形式で入力してください' };
    const amount = parseInteger(input.refundAmount);
    if (amount == null || amount < 0) return { success: false, error: '返還金額を入力してください' };

    const now = new Date();
    const result = await db
      .insert(refunds)
      .values({
        customerId: input.customerId,
        billId: input.billId || null,
        reasonCode: input.reasonCode,
        cancelDate: input.cancelDate || null,
        terminationDate: input.terminationDate || null,
        supplyStartDate: input.supplyStartDate || null,
        refundMonth: input.refundMonth,
        refundAmount: amount,
        note: input.note || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: refunds.id });

    if (input.billId) {
      await db.update(electricityBills).set({ refundFlagged: true, updatedAt: now }).where(eq(electricityBills.id, input.billId));
    }

    await db.insert(auditLogs).values({
      action: 'create_refund',
      resourceType: 'refund',
      resourceId: result[0]?.id ?? null,
      diff: input,
      createdAt: now,
    });

    revalidatePath('/bills');
    revalidatePath('/refunds');
    revalidatePath('/kpi');
    return { success: true, id: result[0]?.id };
  } catch (err) {
    console.error('createRefund error:', err);
    return { success: false, error: '保存に失敗しました' };
  }
}
