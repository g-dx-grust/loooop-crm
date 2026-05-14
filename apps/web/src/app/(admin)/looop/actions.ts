'use server';

import { db, looopContracts, crossSellOpportunities, activities, auditLogs, eq, and, isNull } from '@looop/db';
import { revalidatePath } from 'next/cache';
import { LOOOP_PAYMENT_METHODS, LOOOP_PLAN_CODES } from '@/lib/constants';

export interface ApplicationFormInput {
  customerId: string;
  applicationDate?: string | null;
  contractDate?: string | null;
  supplyStartDate?: string | null;
  planCode: string;
  paymentMethod: string;
  status: string;
  cancelDate?: string | null;
  terminationDate?: string | null;
  cancelReason?: string | null;
  memo?: string | null;
}

export async function createApplication(
  input: ApplicationFormInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!input.customerId) return { success: false, error: '顧客を選択してください' };
    if (!(LOOOP_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) {
      return { success: false, error: '支払方法が不正です' };
    }
    if (!(LOOOP_PLAN_CODES as readonly string[]).includes(input.planCode)) {
      return { success: false, error: '対象プランが不正です' };
    }

    const now = new Date();
    const result = await db
      .insert(looopContracts)
      .values({
        customerId: input.customerId,
        planCode: input.planCode,
        paymentMethod: input.paymentMethod,
        status: input.status,
        applicationDate: input.applicationDate || null,
        contractDate: input.contractDate || null,
        supplyStartDate: input.supplyStartDate || null,
        cancelDate: input.cancelDate || null,
        terminationDate: input.terminationDate || null,
        cancelReason: input.cancelReason || null,
        memo: input.memo || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: looopContracts.id });

    await db.insert(auditLogs).values({
      action: 'create_application',
      resourceType: 'looop_contract',
      resourceId: result[0]?.id ?? null,
      diff: input,
      createdAt: now,
    });

    revalidatePath('/looop');
    revalidatePath('/customers');
    return { success: true, id: result[0]?.id };
  } catch (err) {
    console.error('createApplication error:', err);
    return { success: false, error: '保存に失敗しました' };
  }
}

export async function updateLooopStatus(
  contractId: string,
  status: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch existing record
    const existing = await db
      .select()
      .from(looopContracts)
      .where(eq(looopContracts.id, contractId))
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: '契約が見つかりません' };
    }

    const prev = existing[0];

    const now = new Date();
    const updates: Partial<typeof looopContracts.$inferInsert> = {
      status,
      updatedAt: now,
    };

    if (status === 'cancelled') {
      updates.cancelDate = now.toISOString().slice(0, 10);
      updates.cancelReason = reason ?? '';
    }
    if (status === 'terminated') {
      updates.terminationDate = now.toISOString().slice(0, 10);
      if (reason) updates.cancelReason = reason;
    }
    if (status === 'completed' && !prev.openedDate) {
      updates.openedDate = now.toISOString().slice(0, 10);
    }
    if (status === 'completed' && !prev.contractDate) {
      updates.contractDate = now.toISOString().slice(0, 10);
    }

    await db
      .update(looopContracts)
      .set(updates)
      .where(eq(looopContracts.id, contractId));

    // Insert activity record
    await db.insert(activities).values({
      customerId: prev.customerId,
      activityType: 'status_change',
      content: `Looopステータス変更: ${prev.status} → ${status}${reason ? `（理由: ${reason}）` : ''}`,
      createdAt: now,
    });

    // Insert audit log
    await db.insert(auditLogs).values({
      action: 'update_looop_status',
      resourceType: 'looop_contract',
      resourceId: contractId,
      diff: { before: { status: prev.status }, after: { status }, reason },
      createdAt: now,
    });

    // Auto-create hikari cross-sell opportunity when status becomes 'completed'
    if (status === 'completed') {
      const existing = await db
        .select({ id: crossSellOpportunities.id })
        .from(crossSellOpportunities)
        .where(
          and(
            eq(crossSellOpportunities.customerId, prev.customerId),
            eq(crossSellOpportunities.productType, 'hikari'),
            isNull(crossSellOpportunities.deletedAt),
          ),
        )
        .limit(1);

      if (!existing[0]) {
        await db.insert(crossSellOpportunities).values({
          customerId: prev.customerId,
          productType: 'hikari',
          status: 'not_proposed',
          interestRank: null,
        });
      }
    }

    revalidatePath('/looop');
    revalidatePath('/cross-sell');
    return { success: true };
  } catch (err) {
    console.error('updateLooopStatus error:', err);
    return { success: false, error: '更新に失敗しました' };
  }
}
