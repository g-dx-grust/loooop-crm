'use server';

import {
  db,
  activities,
  consents,
  looopContracts,
  crossSellOpportunities,
  customers,
  eq,
  and,
  isNull,
  desc,
} from '@looop/db';
import { logAudit } from '@looop/audit';
import { requireUser } from '@looop/auth';

export interface ActivityInput {
  activityType: string;
  content?: string;
  nextActionDate?: string;
}

export async function addActivity(
  customerId: string,
  input: ActivityInput,
): Promise<{ success: true }> {
  const user = await requireUser();

  await db.insert(activities).values({
    customerId,
    staffId: user.id,
    activityType: input.activityType,
    content: input.content ?? null,
    nextActionDate: input.nextActionDate ?? null,
  });

  await logAudit({
    action: 'activity.create',
    resourceType: 'customer',
    resourceId: customerId,
    diff: { activityType: input.activityType },
  });

  return { success: true };
}

export async function revokeSolarConsent(
  customerId: string,
  reason: string,
): Promise<{ success: true }> {
  const user = await requireUser();

  // Find the latest granted solar_partner_share consent
  const consentRows = await db
    .select()
    .from(consents)
    .where(
      and(
        eq(consents.customerId, customerId),
        eq(consents.consentType, 'solar_partner_share'),
        eq(consents.consentStatus, 'granted'),
      ),
    )
    .orderBy(desc(consents.consentedAt))
    .limit(1);

  const consent = consentRows[0];
  if (!consent) {
    throw new Error('撤回対象の同意が見つかりません');
  }

  // Insert a withdrawal record
  await db.insert(consents).values({
    customerId,
    consentType: 'solar_partner_share',
    consentStatus: 'withdrawn',
    consentTextVersion: consent.consentTextVersion,
    consentedAt: new Date(),
    consentedBy: user.id,
    withdrawnAt: new Date(),
    withdrawalReason: reason,
  });

  await logAudit({
    action: 'consent.revoke',
    resourceType: 'customer',
    resourceId: customerId,
    diff: { consentType: 'solar_partner_share', reason },
  });

  return { success: true };
}

export async function updateLooopStatus(
  contractId: string,
  status: string,
  reason: string,
): Promise<{ success: true }> {
  const user = await requireUser();

  // Fetch the contract to get customerId for audit
  const contractRows = await db
    .select()
    .from(looopContracts)
    .where(and(eq(looopContracts.id, contractId), isNull(looopContracts.deletedAt)))
    .limit(1);

  const contract = contractRows[0];
  if (!contract) throw new Error('契約が見つかりません');

  await db
    .update(looopContracts)
    .set({ status, updatedAt: new Date() })
    .where(eq(looopContracts.id, contractId));

  // Log the status change as an activity
  await db.insert(activities).values({
    customerId: contract.customerId,
    staffId: user.id,
    activityType: 'status_change',
    content: `Looopステータスを「${status}」に変更。理由: ${reason}`,
  });

  await logAudit({
    action: 'looop_contract.status_change',
    resourceType: 'looop_contract',
    resourceId: contractId,
    diff: { from: contract.status, to: status, reason },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// upsertCrossSellOpportunity
// ---------------------------------------------------------------------------

export interface UpsertCrossSellInput {
  productType: string;
  status: string;
  interestRank?: string;
  nextActionDate?: string;
  expectedRevenue?: number;
  actualRevenue?: number;
  grossProfit?: number;
  memo?: string;
}

export async function upsertCrossSellOpportunity(
  customerId: string,
  input: UpsertCrossSellInput,
): Promise<{ success: true }> {
  const user = await requireUser();

  const existing = await db
    .select()
    .from(crossSellOpportunities)
    .where(
      and(
        eq(crossSellOpportunities.customerId, customerId),
        eq(crossSellOpportunities.productType, input.productType),
        isNull(crossSellOpportunities.deletedAt),
      ),
    )
    .limit(1);

  const now = new Date();

  if (existing[0]) {
    await db
      .update(crossSellOpportunities)
      .set({
        status: input.status,
        interestRank: input.interestRank ?? null,
        nextActionDate: input.nextActionDate ?? null,
        expectedRevenue: input.expectedRevenue ?? null,
        actualRevenue: input.actualRevenue ?? null,
        grossProfit: input.grossProfit ?? null,
        memo: input.memo ?? null,
        updatedAt: now,
      })
      .where(eq(crossSellOpportunities.id, existing[0].id));

    await logAudit({
      action: 'cross_sell.update',
      resourceType: 'cross_sell_opportunity',
      resourceId: existing[0].id,
      diff: { before: { status: existing[0].status }, after: input },
    });
  } else {
    await db.insert(crossSellOpportunities).values({
      customerId,
      productType: input.productType,
      status: input.status,
      interestRank: input.interestRank ?? null,
      nextActionDate: input.nextActionDate ?? null,
      expectedRevenue: input.expectedRevenue ?? null,
      actualRevenue: input.actualRevenue ?? null,
      grossProfit: input.grossProfit ?? null,
      memo: input.memo ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit({
      action: 'cross_sell.create',
      resourceType: 'cross_sell_opportunity',
      resourceId: customerId,
      diff: { customerId, ...input },
    });
  }

  await db.insert(activities).values({
    customerId,
    staffId: user.id,
    activityType: 'status_change',
    content: `クロスセル(${input.productType}) → ${input.status}`,
    nextActionDate: input.nextActionDate ?? null,
    createdAt: now,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// updateCustomer — basic info edit
// ---------------------------------------------------------------------------

export interface UpdateCustomerInput {
  name: string;
  kana?: string;
  birthDate?: string;
  memo?: string;
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<{ success: true }> {
  await requireUser();

  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
    .limit(1);

  if (!existing[0]) throw new Error('顧客が見つかりません');

  await db
    .update(customers)
    .set({
      name: input.name,
      kana: input.kana ?? null,
      birthDate: input.birthDate ?? null,
      memo: input.memo ?? null,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  await logAudit({
    action: 'customer.update',
    resourceType: 'customer',
    resourceId: customerId,
    diff: { before: { name: existing[0].name }, after: input },
  });

  return { success: true };
}
