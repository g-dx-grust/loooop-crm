'use server';

import { db, crossSellOpportunities, activities, auditLogs, eq } from '@looop/db';
import { revalidatePath } from 'next/cache';

export interface UpdateCrossSellInput {
  status: string;
  interestRank?: string;
  memo?: string;
  nextActionDate?: string;
}

export async function updateCrossSell(
  id: string,
  input: UpdateCrossSellInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db
      .select()
      .from(crossSellOpportunities)
      .where(eq(crossSellOpportunities.id, id))
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: '対象が見つかりません' };
    }

    const prev = existing[0];
    const now = new Date();

    await db
      .update(crossSellOpportunities)
      .set({
        status: input.status,
        interestRank: input.interestRank ?? prev.interestRank,
        memo: input.memo ?? prev.memo,
        nextActionDate: input.nextActionDate ?? prev.nextActionDate,
        updatedAt: now,
      })
      .where(eq(crossSellOpportunities.id, id));

    // Activity log
    await db.insert(activities).values({
      customerId: prev.customerId,
      activityType: 'status_change',
      content: `クロスセル(${prev.productType})ステータス変更: ${prev.status} → ${input.status}`,
      nextActionDate: input.nextActionDate ?? null,
      createdAt: now,
    });

    // Audit log
    await db.insert(auditLogs).values({
      action: 'update_cross_sell',
      resourceType: 'cross_sell_opportunity',
      resourceId: id,
      diff: { before: { status: prev.status }, after: input },
      createdAt: now,
    });

    revalidatePath('/cross-sell');
    return { success: true };
  } catch (err) {
    console.error('updateCrossSell error:', err);
    return { success: false, error: '更新に失敗しました' };
  }
}
